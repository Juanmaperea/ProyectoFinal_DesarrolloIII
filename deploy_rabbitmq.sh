#!/bin/bash

# Script de despliegue para RabbitMQ implementation
# Uso: ./deploy_rabbitmq.sh

set -e

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🐰 RabbitMQ Task Manager Deployment            ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Verificar Docker
check_docker() {
    echo -e "${BLUE}🔍 Verificando Docker...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker no está instalado${NC}"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker daemon no está corriendo${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker OK${NC}"
}

# Verificar docker-compose
check_docker_compose() {
    echo -e "${BLUE}🔍 Verificando Docker Compose...${NC}"
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose no está instalado${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker Compose OK${NC}"
}

# Limpiar contenedores previos
cleanup() {
    echo -e "\n${YELLOW}🧹 Limpiando contenedores previos...${NC}"
    
    docker-compose down -v 2>/dev/null || true
    
    echo -e "${GREEN}✅ Limpieza completada${NC}"
}

# Construir imágenes
build_images() {
    echo -e "\n${YELLOW}🏗️  Construyendo imágenes...${NC}"
    
    docker-compose build --no-cache
    
    echo -e "${GREEN}✅ Imágenes construidas${NC}"
}

# Iniciar servicios
start_services() {
    echo -e "\n${YELLOW}🚀 Iniciando servicios...${NC}"
    
    docker-compose up -d
    
    echo -e "${GREEN}✅ Servicios iniciados${NC}"
}

# Esperar a que servicios estén listos
wait_for_services() {
    echo -e "\n${YELLOW}⏳ Esperando a que servicios estén listos...${NC}"
    
    # Esperar RabbitMQ
    echo -e "${BLUE}   Esperando RabbitMQ...${NC}"
    for i in {1..30}; do
        if curl -s -u taskuser:taskpass http://localhost:15672/api/overview > /dev/null 2>&1; then
            echo -e "${GREEN}   ✅ RabbitMQ listo${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # Esperar PostgreSQL
    echo -e "${BLUE}   Esperando PostgreSQL...${NC}"
    for i in {1..30}; do
        if docker-compose exec -T postgres pg_isready -U taskuser > /dev/null 2>&1; then
            echo -e "${GREEN}   ✅ PostgreSQL listo${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # Esperar servicios
    echo -e "${BLUE}   Esperando Task Service...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:8002/health > /dev/null 2>&1; then
            echo -e "${GREEN}   ✅ Task Service listo${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    echo -e "${BLUE}   Esperando Notification Service...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:8003/health > /dev/null 2>&1; then
            echo -e "${GREEN}   ✅ Notification Service listo${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    echo -e "${BLUE}   Esperando Gateway...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            echo -e "${GREEN}   ✅ Gateway listo${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
}

# Verificar estado de servicios
verify_services() {
    echo -e "\n${YELLOW}🔍 Verificando estado de servicios...${NC}"
    
    docker-compose ps
}

# Mostrar información de acceso
show_access_info() {
    echo -e "\n${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✅ Despliegue Completado Exitosamente          ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
    
    echo -e "\n${BLUE}📍 Acceso a Servicios:${NC}"
    echo -e "   ${YELLOW}Frontend:${NC}              http://localhost:5173"
    echo -e "   ${YELLOW}API Gateway:${NC}           http://localhost:8000"
    echo -e "   ${YELLOW}Auth Service:${NC}          http://localhost:8001"
    echo -e "   ${YELLOW}Task Service:${NC}          http://localhost:8002"
    echo -e "   ${YELLOW}Notification Service:${NC}  http://localhost:8003"
    echo -e "   ${YELLOW}RabbitMQ Management:${NC}   http://localhost:15672"
    
    echo -e "\n${BLUE}🔑 Credenciales RabbitMQ:${NC}"
    echo -e "   ${YELLOW}Usuario:${NC}   taskuser"
    echo -e "   ${YELLOW}Password:${NC}  taskpass"
    
    echo -e "\n${BLUE}📊 Comandos Útiles:${NC}"
    echo -e "   ${YELLOW}Ver logs:${NC}"
    echo -e "     docker-compose logs -f"
    echo -e ""
    echo -e "   ${YELLOW}Ver logs de un servicio:${NC}"
    echo -e "     docker-compose logs -f task_service"
    echo -e ""
    echo -e "   ${YELLOW}Reiniciar servicios:${NC}"
    echo -e "     docker-compose restart"
    echo -e ""
    echo -e "   ${YELLOW}Detener servicios:${NC}"
    echo -e "     docker-compose down"
    echo -e ""
    echo -e "   ${YELLOW}Ver estado:${NC}"
    echo -e "     docker-compose ps"
    
    echo -e "\n${BLUE}🧪 Testing:${NC}"
    echo -e "   ${YELLOW}Ejecutar suite de tests:${NC}"
    echo -e "     chmod +x test_rabbitmq.sh"
    echo -e "     ./test_rabbitmq.sh"
    
    echo -e "\n${BLUE}📚 Documentación:${NC}"
    echo -e "   Lee ${YELLOW}RABBITMQ_IMPLEMENTATION.md${NC} para más detalles"
    
    echo ""
}

# Menú principal
main() {
    echo -e "${BLUE}¿Qué deseas hacer?${NC}"
    echo "1) Despliegue completo (limpio)"
    echo "2) Iniciar servicios existentes"
    echo "3) Reconstruir y reiniciar"
    echo "4) Ver logs"
    echo "5) Ver estado de servicios"
    echo "6) Detener servicios"
    echo "7) Salir"
    echo ""
    read -p "Selecciona una opción: " option
    
    case $option in
        1)
            check_docker
            check_docker_compose
            cleanup
            build_images
            start_services
            wait_for_services
            verify_services
            show_access_info
            ;;
        2)
            check_docker
            check_docker_compose
            start_services
            wait_for_services
            verify_services
            show_access_info
            ;;
        3)
            check_docker
            check_docker_compose
            cleanup
            build_images
            start_services
            wait_for_services
            verify_services
            show_access_info
            ;;
        4)
            docker-compose logs -f
            ;;
        5)
            docker-compose ps
            ;;
        6)
            echo -e "${YELLOW}🛑 Deteniendo servicios...${NC}"
            docker-compose down
            echo -e "${GREEN}✅ Servicios detenidos${NC}"
            ;;
        7)
            echo -e "${BLUE}👋 Adiós!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Opción inválida${NC}"
            exit 1
            ;;
    esac
}

# Ejecutar
main