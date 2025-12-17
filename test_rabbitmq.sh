#!/bin/bash

# Script para probar la implementación de RabbitMQ
# Uso: ./test_rabbitmq.sh

set -e

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:8000"
NOTIFICATION_URL="http://localhost:8003"

echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   RabbitMQ Implementation Test Suite            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Función para imprimir secciones
print_section() {
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════${NC}"
    echo -e "${YELLOW}  $1${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════${NC}"
    echo ""
}

# Función para verificar servicios
check_services() {
    print_section "1. Verificando Servicios"
    
    echo -e "${BLUE}🔍 Checking Gateway...${NC}"
    curl -s "$API_URL/health" | jq . || echo -e "${RED}❌ Gateway no disponible${NC}"
    
    echo -e "\n${BLUE}🔍 Checking Notification Service...${NC}"
    curl -s "$NOTIFICATION_URL/health" | jq . || echo -e "${RED}❌ Notification Service no disponible${NC}"
    
    echo -e "\n${BLUE}🔍 Checking RabbitMQ Management UI...${NC}"
    curl -s -u taskuser:taskpass "http://localhost:15672/api/overview" | jq -r '.cluster_name, .rabbitmq_version' || echo -e "${RED}❌ RabbitMQ no disponible${NC}"
}

# Función para registrar usuario
register_user() {
    print_section "2. Registrando Usuario de Prueba"
    
    EMAIL="test_$(date +%s)@example.com"
    PASSWORD="password123"
    
    echo -e "${BLUE}📝 Email: $EMAIL${NC}"
    
    REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
    
    echo "$REGISTER_RESPONSE" | jq .
    
    if echo "$REGISTER_RESPONSE" | grep -q "User registered"; then
        echo -e "${GREEN}✅ Usuario registrado exitosamente${NC}"
    else
        echo -e "${RED}❌ Error al registrar usuario${NC}"
        exit 1
    fi
}

# Función para login
login_user() {
    print_section "3. Login"
    
    echo -e "${BLUE}🔐 Logging in...${NC}"
    
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
    
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
    
    if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
        echo -e "${GREEN}✅ Login exitoso${NC}"
        echo -e "${BLUE}🎟️  Token: ${TOKEN:0:20}...${NC}"
    else
        echo -e "${RED}❌ Error en login${NC}"
        echo "$LOGIN_RESPONSE" | jq .
        exit 1
    fi
}

# Función para crear tarea (flujo exitoso)
test_successful_task() {
    print_section "4. Test: Creación de Tarea Exitosa"
    
    # Configurar tasa de fallo baja
    echo -e "${BLUE}⚙️  Configurando tasa de fallo: 0%${NC}"
    curl -s -X POST "$NOTIFICATION_URL/config/failure-rate" \
        -H "Content-Type: application/json" \
        -d '0.0' | jq .
    
    sleep 1
    
    echo -e "\n${BLUE}📝 Creando tarea...${NC}"
    
    TASK_RESPONSE=$(curl -s -X POST "$API_URL/tasks/" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"title":"RabbitMQ Success Test","description":"Should succeed"}')
    
    echo "$TASK_RESPONSE" | jq .
    
    TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.id')
    
    if [ "$TASK_ID" != "null" ] && [ -n "$TASK_ID" ]; then
        echo -e "${GREEN}✅ Tarea creada: ID=$TASK_ID${NC}"
        
        # Esperar procesamiento asíncrono
        echo -e "${BLUE}⏳ Esperando procesamiento de notificación (3s)...${NC}"
        sleep 3
        
        # Verificar que la tarea existe
        echo -e "\n${BLUE}🔍 Verificando tarea...${NC}"
        TASKS=$(curl -s -X GET "$API_URL/tasks/" \
            -H "Authorization: Bearer $TOKEN")
        
        if echo "$TASKS" | jq -e ".[] | select(.id == $TASK_ID)" > /dev/null; then
            echo -e "${GREEN}✅ Tarea confirmada en sistema${NC}"
        else
            echo -e "${RED}❌ Tarea no encontrada${NC}"
        fi
    else
        echo -e "${RED}❌ Error al crear tarea${NC}"
    fi
}

# Función para test de rollback
test_rollback() {
    print_section "5. Test: Rollback con Compensación"
    
    # Configurar tasa de fallo alta
    echo -e "${BLUE}⚙️  Configurando tasa de fallo: 100%${NC}"
    curl -s -X POST "$NOTIFICATION_URL/config/failure-rate" \
        -H "Content-Type: application/json" \
        -d '1.0' | jq .
    
    sleep 1
    
    echo -e "\n${BLUE}📝 Creando tarea (debería compensarse)...${NC}"
    
    TASK_RESPONSE=$(curl -s -X POST "$API_URL/tasks/" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"title":"RabbitMQ Rollback Test","description":"Should be compensated"}')
    
    TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.id')
    
    if [ "$TASK_ID" != "null" ] && [ -n "$TASK_ID" ]; then
        echo -e "${YELLOW}⚠️  Tarea creada temporalmente: ID=$TASK_ID${NC}"
        
        # Esperar compensación
        echo -e "${BLUE}⏳ Esperando compensación (5s)...${NC}"
        sleep 5
        
        # Verificar que la tarea NO existe
        echo -e "\n${BLUE}🔍 Verificando rollback...${NC}"
        TASKS=$(curl -s -X GET "$API_URL/tasks/" \
            -H "Authorization: Bearer $TOKEN")
        
        if echo "$TASKS" | jq -e ".[] | select(.id == $TASK_ID)" > /dev/null; then
            echo -e "${RED}❌ Tarea NO fue compensada (aún existe)${NC}"
        else
            echo -e "${GREEN}✅ Rollback exitoso - Tarea fue compensada${NC}"
        fi
    else
        echo -e "${RED}❌ Error al crear tarea${NC}"
    fi
}

# Función para ver logs de SAGA
view_saga_logs() {
    print_section "6. Logs de SAGA"
    
    echo -e "${BLUE}📊 Obteniendo logs de SAGA...${NC}"
    
    LOGS=$(curl -s -X GET "$API_URL/tasks/saga-logs" \
        -H "Authorization: Bearer $TOKEN")
    
    echo "$LOGS" | jq -r '.[] | "\(.timestamp) | \(.status) | \(.saga_id) | \(.details)"' | head -10
}

# Función para verificar RabbitMQ
check_rabbitmq_stats() {
    print_section "7. Estadísticas de RabbitMQ"
    
    echo -e "${BLUE}📈 Obteniendo stats de RabbitMQ...${NC}"
    
    # Exchanges
    echo -e "\n${YELLOW}Exchanges:${NC}"
    curl -s -u taskuser:taskpass "http://localhost:15672/api/exchanges/%2F" | \
        jq -r '.[] | select(.name | contains("task") or contains("notification")) | "\(.name) - Type: \(.type)"'
    
    # Queues
    echo -e "\n${YELLOW}Queues:${NC}"
    curl -s -u taskuser:taskpass "http://localhost:15672/api/queues/%2F" | \
        jq -r '.[] | "\(.name) - Messages: \(.messages) - Consumers: \(.consumers)"'
    
    # Connections
    echo -e "\n${YELLOW}Connections:${NC}"
    curl -s -u taskuser:taskpass "http://localhost:15672/api/connections" | \
        jq -r '.[] | "\(.client_properties.connection_name // .name) - State: \(.state)"'
}

# Función principal
main() {
    check_services
    register_user
    login_user
    test_successful_task
    test_rollback
    view_saga_logs
    check_rabbitmq_stats
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✅ Tests Completados                           ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}💡 Tips:${NC}"
    echo -e "   - Ver Management UI: ${YELLOW}http://localhost:15672${NC}"
    echo -e "   - Usuario: ${YELLOW}taskuser${NC}"
    echo -e "   - Password: ${YELLOW}taskpass${NC}"
    echo ""
    echo -e "${BLUE}📊 Ver logs en tiempo real:${NC}"
    echo -e "   ${YELLOW}docker-compose logs -f task_service notification_service${NC}"
    echo ""
}

# Ejecutar
main