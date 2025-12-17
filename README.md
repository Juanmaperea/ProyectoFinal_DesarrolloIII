# Task Manager - Microservices con RabbitMQ

Sistema de gestión de tareas basado en microservicios con arquitectura event-driven utilizando RabbitMQ, patrón SAGA y coreografía de servicios.

## 🎯 Nuevas Funcionalidades Implementadas

### 1. ✅ Sistema de Autenticación Mejorado
- **Cierre de sesión**: Botón de logout en el header con menú desplegable
- **Información del usuario**: Muestra nombre y email del usuario autenticado
- **Registro con nombre**: Campo adicional para capturar el nombre completo del usuario
- **Tokens JWT mejorados**: Incluyen información del usuario para personalización

### 2. 👋 Experiencia Personalizada
- **Mensaje de bienvenida**: "¡Bienvenido/a, [Nombre]!" en el dashboard
- **Header personalizado**: Muestra el nombre del usuario en la barra superior
- **Menú de usuario**: Dropdown con información del usuario y opción de logout

### 3. 📋 Gestión Avanzada de Tareas

#### Nuevos Atributos de Tareas
- **Estado**: Por Hacer, Haciendo, Hecho
- **Categoría**: Frontend, Backend, Full Stack, Product Owner, Scrum, Mixto, QA
- **Prioridad**: Alta (🔴), Media (🟡), Baja (🟢)
- **Código único**: Identificador alfanumérico (ej: TASK-A1B2C3)

#### Operaciones CRUD Completas
- ✅ **Crear**: Formulario con todos los campos nuevos
- ✅ **Leer**: Listado completo con filtros
- ✅ **Actualizar**: Modal de edición para modificar cualquier campo
- ✅ **Eliminar**: Confirmación antes de eliminar
- ✅ **Consultar por código**: Endpoint específico para buscar por código único

#### Sistema de Filtros
- 🔍 **Búsqueda por texto**: Busca en título y descripción
- 📊 **Filtro por estado**: Todo, Por Hacer, Haciendo, Hecho
- 🏷️ **Filtro por categoría**: Todas las categorías disponibles
- ⚡ **Filtro por prioridad**: Alta, Media, Baja
- 🧹 **Limpiar filtros**: Botón para resetear todos los filtros

### 4. 🎨 Interfaz Rediseñada

#### Paleta de Colores Profesional
- **Gradientes principales**: Púrpura (#667eea) a Violeta (#764ba2)
- **Estados de tareas**:
  - Por Hacer: Azul (#3498db)
  - Haciendo: Naranja (#f39c12)
  - Hecho: Verde (#27ae60)
- **Categorías**: Colores distintivos por tipo de tarea
- **Background**: Gradiente suave gris-azul (#f5f7fa a #c3cfe2)

#### Componentes Visuales Mejorados
- 📊 **Panel de estadísticas**: Cards con contadores de tareas por estado
- 🎴 **Cards de tareas**: Bordes laterales coloridos según estado
- 🎯 **Badges y chips**: Indicadores visuales para categoría, prioridad y estado
- 📈 **Efectos hover**: Animaciones suaves al interactuar
- 🌈 **AppBar gradiente**: Header con diseño moderno
- 💫 **Transiciones**: Animaciones fluidas entre estados

#### Elementos UI Nuevos
- **Diálogos modales**: Para edición de tareas
- **Menús desplegables**: Para filtros y acciones de usuario
- **Indicadores de carga**: Progress bars y spinners
- **Tooltips informativos**: Ayudas contextuales
- **Alerts y notificaciones**: Feedback visual de acciones

## 🏗️ Arquitectura

### Microservicios
```
┌─────────────────┐
│    Frontend     │ (React + Material-UI)
│   Port: 5173    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Gateway   │ (FastAPI)
│   Port: 8000    │
└────────┬────────┘
         │
    ┌────┴─────┬──────────────┐
    ▼          ▼              ▼
┌────────┐ ┌────────┐  ┌──────────────┐
│  Auth  │ │  Task  │  │ Notification │
│Service │ │Service │  │   Service    │
│  8001  │ │  8002  │  │     8003     │
└────────┘ └───┬────┘  └──────┬───────┘
               │                │
               └────┐    ┌──────┘
                    ▼    ▼
              ┌──────────────┐
              │   RabbitMQ   │
              │ 5672 / 15672 │
              └──────────────┘
                    ▲
                    │
              ┌──────────────┐
              │  PostgreSQL  │
              │     5432     │
              └──────────────┘
```

### Flujo de Eventos (SAGA Pattern)
1. **Usuario crea tarea** → Task Service
2. **Task Service** crea tarea en DB → Publica evento a RabbitMQ
3. **Notification Service** consume evento → Procesa notificación
4. **Notification Service** publica resultado → RabbitMQ
5. **Task Service** consume resultado:
   - ✅ Éxito: Registra en logs
   - ❌ Fallo: Ejecuta compensación (elimina tarea)

## 🚀 Instalación y Despliegue

### Prerequisitos
- Docker & Docker Compose
- Python 3.11+ (para migraciones)
- Node.js 18+ (desarrollo local)

### Paso 1: Clonar y Preparar
```bash
git clone <repository>
cd task-manager-microservices
```

### Paso 2: Ejecutar Migraciones
```bash
# Asegurarse de que PostgreSQL esté corriendo
docker-compose up -d postgres

# Esperar a que PostgreSQL esté listo
sleep 10

# Ejecutar migraciones
python migrate_db.py
```

### Paso 3: Desplegar Servicios
```bash
# Opción 1: Usando el script automatizado
chmod +x deploy_rabbitmq.sh
./deploy_rabbitmq.sh

# Opción 2: Manual
docker-compose down -v
docker-compose up --build -d
```

### Paso 4: Verificar
```bash
# Ver logs
docker-compose logs -f

# Verificar servicios
curl http://localhost:8000/health  # Gateway
curl http://localhost:8001/health  # Auth
curl http://localhost:8002/health  # Task
curl http://localhost:8003/health  # Notification
```

## 📱 Uso de la Aplicación

### Acceso
- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:8000
- **RabbitMQ Management**: http://localhost:15672 (taskuser/taskpass)

### Flujo de Usuario

1. **Registro**
   - Ir a /register
   - Ingresar nombre, email y contraseña
   - Redirección automática a login

2. **Login**
   - Ingresar credenciales
   - Acceso al dashboard personalizado

3. **Dashboard**
   - Ver mensaje de bienvenida con nombre
   - Ver estadísticas de tareas
   - Monitorear estado de RabbitMQ

4. **Crear Tarea**
   - Llenar formulario con título, descripción, categoría y prioridad
   - Recibir código único de tarea
   - Ver tarea en listado

5. **Gestionar Tareas**
   - **Filtrar**: Por estado, categoría, prioridad o texto
   - **Editar**: Click en ícono de lápiz, modificar campos, guardar
   - **Eliminar**: Click en ícono de basura, confirmar
   - **Buscar por código**: Usar filtro de búsqueda

6. **Cerrar Sesión**
   - Click en avatar en header
   - Seleccionar "Cerrar Sesión"

## 🧪 Testing

### Tests Automatizados
```bash
# Ejecutar suite de tests
chmod +x test_rabbitmq.sh
./test_rabbitmq.sh
```

### Tests Manuales

#### Test 1: Crear Tarea con Éxito
```bash
# Registrar usuario
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"test123"}'

# Login
TOKEN=$(curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' \
  | jq -r '.access_token')

# Crear tarea
curl -X POST http://localhost:8000/tasks/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Tarea de prueba",
    "description":"Descripción",
    "category":"Backend",
    "priority":"Alta"
  }'
```

#### Test 2: Filtrar Tareas
```bash
# Filtrar por estado
curl -X GET "http://localhost:8000/tasks/?status=todo" \
  -H "Authorization: Bearer $TOKEN"

# Filtrar por categoría
curl -X GET "http://localhost:8000/tasks/?category=Backend" \
  -H "Authorization: Bearer $TOKEN"

# Buscar por texto
curl -X GET "http://localhost:8000/tasks/?search=prueba" \
  -H "Authorization: Bearer $TOKEN"
```

#### Test 3: Actualizar Tarea
```bash
# Actualizar estado
curl -X PUT http://localhost:8000/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'
```

#### Test 4: Consultar por Código
```bash
# Buscar por código único
curl -X GET http://localhost:8000/tasks/code/TASK-A1B2C3 \
  -H "Authorization: Bearer $TOKEN"
```

## 🔧 Configuración

### Variables de Entorno

**Auth Service:**
```env
JWT_SECRET_KEY=supersecret
DATABASE_URL=postgresql+psycopg2://taskuser:taskpass@postgres:5432/taskdb
```

**Task Service:**
```env
JWT_SECRET_KEY=supersecret
DATABASE_URL=postgresql+psycopg2://taskuser:taskpass@postgres:5432/taskdb
RABBITMQ_URL=amqp://taskuser:taskpass@rabbitmq:5672/
```

**Notification Service:**
```env
RABBITMQ_URL=amqp://taskuser:taskpass@rabbitmq:5672/
```

### Ajustar Tasa de Fallo de Notificaciones
```bash
# Establecer fallo en 30% (para demostración de SAGA)
curl -X POST http://localhost:8003/config/failure-rate \
  -H "Content-Type: application/json" \
  -d '0.3'

# Establecer en 0% (sin fallos)
curl -X POST http://localhost:8003/config/failure-rate \
  -H "Content-Type: application/json" \
  -d '0.0'
```

## 📊 Monitoreo

### RabbitMQ Management UI
- URL: http://localhost:15672
- Usuario: taskuser
- Password: taskpass

**Métricas disponibles:**
- Exchanges y routing keys
- Queues y mensajes pendientes
- Conexiones activas
- Tasa de publicación/consumo

### Logs de Aplicación
```bash
# Ver todos los logs
docker-compose logs -f

# Ver logs específicos
docker-compose logs -f task_service
docker-compose logs -f notification_service

# Ver últimas 100 líneas
docker-compose logs --tail=100
```

### Logs de SAGA
- Accesibles desde el dashboard (botón "Ver Logs SAGA")
- También vía API: `GET /tasks/saga-logs`

## 🛠️ Solución de Problemas

### Base de datos no actualizada
```bash
# Ejecutar migraciones manualmente
docker-compose exec postgres psql -U taskuser -d taskdb

# Verificar columnas
\d users
\d tasks
```

### RabbitMQ no conecta
```bash
# Verificar estado
docker-compose ps rabbitmq

# Reiniciar
docker-compose restart rabbitmq

# Ver logs
docker-compose logs rabbitmq
```

### Frontend no carga
```bash
# Verificar si Vite está corriendo
docker-compose logs frontend

# Reconstruir
docker-compose up --build frontend
```

## 📚 Tecnologías Utilizadas

### Backend
- **FastAPI**: Framework web asíncrono
- **SQLAlchemy**: ORM para PostgreSQL
- **Pika**: Cliente Python para RabbitMQ
- **python-jose**: Manejo de JWT
- **passlib**: Hashing de contraseñas

### Frontend
- **React 18**: Biblioteca UI
- **Material-UI (MUI)**: Componentes UI
- **React Router**: Navegación
- **Axios**: Cliente HTTP
- **Vite**: Build tool

### Infraestructura
- **PostgreSQL 15**: Base de datos relacional
- **RabbitMQ 3.12**: Message broker
- **Docker**: Contenedorización
- **Docker Compose**: Orquestación

## 🎓 Patrones de Diseño Implementados

1. **SAGA Pattern**: Transacciones distribuidas con compensación
2. **Event-Driven Architecture**: Comunicación basada en eventos
3. **Choreography**: Servicios independientes que reaccionan a eventos
4. **API Gateway**: Punto único de entrada
5. **Repository Pattern**: Abstracción de acceso a datos
6. **JWT Authentication**: Seguridad stateless

## 📝 Licencia

MIT

## 👥 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

Para problemas o preguntas:
- Abrir un issue en GitHub
- Consultar la documentación de RabbitMQ: https://www.rabbitmq.com/documentation.html
- Consultar la documentación de FastAPI: https://fastapi.tiangolo.com/