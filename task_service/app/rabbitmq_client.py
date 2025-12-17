import pika
import json
import logging
import os
from typing import Callable, Dict, Any
from threading import Thread
import time

logger = logging.getLogger(__name__)

class RabbitMQClient:
    """
    Cliente para RabbitMQ con patrón Publisher/Subscriber
    Maneja reconexiones automáticas y garantiza entrega de mensajes
    """
    
    def __init__(self, rabbitmq_url: str = None):
        self.rabbitmq_url = rabbitmq_url or os.getenv(
            "RABBITMQ_URL", 
            "amqp://taskuser:taskpass@rabbitmq:5672/"
        )
        self.connection = None
        self.channel = None
        self.is_consuming = False
        
        # Exchanges y Queues
        self.TASK_EVENTS_EXCHANGE = "task_events"
        self.NOTIFICATION_EVENTS_EXCHANGE = "notification_events"
        
    def connect(self, max_retries: int = 5, retry_delay: int = 5):
        """Conectar a RabbitMQ con reintentos"""
        for attempt in range(max_retries):
            try:
                logger.info(f"🔌 Connecting to RabbitMQ (attempt {attempt + 1}/{max_retries})")
                
                parameters = pika.URLParameters(self.rabbitmq_url)
                self.connection = pika.BlockingConnection(parameters)
                self.channel = self.connection.channel()
                
                # Declarar exchanges (topic para routing flexible)
                self.channel.exchange_declare(
                    exchange=self.TASK_EVENTS_EXCHANGE,
                    exchange_type='topic',
                    durable=True
                )
                
                self.channel.exchange_declare(
                    exchange=self.NOTIFICATION_EVENTS_EXCHANGE,
                    exchange_type='topic',
                    durable=True
                )
                
                logger.info("✅ Connected to RabbitMQ successfully")
                return True
                
            except Exception as e:
                logger.error(f"❌ Connection attempt {attempt + 1} failed: {str(e)}")
                if attempt < max_retries - 1:
                    logger.info(f"⏳ Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                else:
                    logger.error("💥 Max retries reached. Could not connect to RabbitMQ")
                    raise
        
        return False
    
    def publish(self, exchange: str, routing_key: str, message: Dict[Any, Any]):
        """
        Publicar mensaje en RabbitMQ con confirmación de entrega
        """
        try:
            if not self.channel or self.channel.is_closed:
                logger.warning("⚠️ Channel closed, reconnecting...")
                self.connect()
            
            # Habilitar confirmación de publicación
            self.channel.confirm_delivery()
            
            body = json.dumps(message)
            
            self.channel.basic_publish(
                exchange=exchange,
                routing_key=routing_key,
                body=body,
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Mensaje persistente
                    content_type='application/json'
                ),
                mandatory=True  # Falla si no hay ninguna queue vinculada
            )
            
            logger.info(f"📤 Published to {exchange}/{routing_key}: {message.get('type', 'unknown')}")
            return True
            
        except pika.exceptions.UnroutableError:
            logger.error(f"❌ Message unroutable: no queue bound to {exchange}/{routing_key}")
            return False
        except Exception as e:
            logger.error(f"💥 Failed to publish message: {str(e)}")
            return False
    
    def consume(self, queue_name: str, callback: Callable, routing_keys: list = None):
        """
        Consumir mensajes de una cola con auto-acknowledgment
        """
        try:
            if not self.channel or self.channel.is_closed:
                self.connect()
            
            # Declarar cola durable
            self.channel.queue_declare(queue=queue_name, durable=True)
            
            # Vincular cola a routing keys
            if routing_keys:
                for exchange, key in routing_keys:
                    self.channel.queue_bind(
                        queue=queue_name,
                        exchange=exchange,
                        routing_key=key
                    )
                    logger.info(f"🔗 Bound {queue_name} to {exchange}/{key}")
            
            # Configurar QoS (procesar un mensaje a la vez)
            self.channel.basic_qos(prefetch_count=1)
            
            # Wrapper para callback con ACK manual
            def callback_wrapper(ch, method, properties, body):
                try:
                    message = json.loads(body)
                    logger.info(f"📨 Received from {queue_name}: {message.get('type', 'unknown')}")
                    
                    # Ejecutar callback del usuario
                    callback(message)
                    
                    # ACK manual después de procesar exitosamente
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    logger.debug(f"✅ ACK sent for message")
                    
                except json.JSONDecodeError as e:
                    logger.error(f"❌ Invalid JSON: {str(e)}")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                    
                except Exception as e:
                    logger.error(f"💥 Error processing message: {str(e)}")
                    # NACK con requeue (el mensaje volverá a la cola)
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
            
            self.channel.basic_consume(
                queue=queue_name,
                on_message_callback=callback_wrapper,
                auto_ack=False  # ACK manual para garantizar procesamiento
            )
            
            logger.info(f"👂 Listening on queue: {queue_name}")
            self.is_consuming = True
            self.channel.start_consuming()
            
        except KeyboardInterrupt:
            logger.info("⏹️ Stopping consumer...")
            self.stop_consuming()
        except Exception as e:
            logger.error(f"💥 Consumer error: {str(e)}")
            raise
    
    def start_consuming_background(self, queue_name: str, callback: Callable, routing_keys: list = None):
        """
        Iniciar consumidor en thread separado (no bloquea FastAPI)
        """
        def consume_thread():
            try:
                self.consume(queue_name, callback, routing_keys)
            except Exception as e:
                logger.error(f"💥 Background consumer error: {str(e)}")
        
        thread = Thread(target=consume_thread, daemon=True)
        thread.start()
        logger.info(f"🚀 Background consumer started for {queue_name}")
    
    def stop_consuming(self):
        """Detener el consumidor de forma limpia"""
        if self.is_consuming and self.channel:
            self.channel.stop_consuming()
            self.is_consuming = False
            logger.info("⏹️ Consumer stopped")
    
    def close(self):
        """Cerrar conexión"""
        try:
            if self.channel and not self.channel.is_closed:
                self.channel.close()
            if self.connection and not self.connection.is_closed:
                self.connection.close()
            logger.info("🔌 RabbitMQ connection closed")
        except Exception as e:
            logger.error(f"Error closing connection: {str(e)}")


# ========== Singleton Global ==========
_rabbitmq_client = None

def get_rabbitmq_client() -> RabbitMQClient:
    """Obtener instancia singleton de RabbitMQ client"""
    global _rabbitmq_client
    if _rabbitmq_client is None:
        _rabbitmq_client = RabbitMQClient()
        _rabbitmq_client.connect()
    return _rabbitmq_client