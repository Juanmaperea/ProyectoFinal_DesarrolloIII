import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import {
  Container,
  Typography,
  CircularProgress,
  Box,
  Alert,
  Button,
  Collapse,
  Chip,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Grid
} from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import TaskCard from "../components/TaskCard";
import TaskForm from "../components/TaskForm";
import SagaLogs from "../components/SagaLogs";
import RabbitMQMonitor from "../components/RabbitMQMonitor";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sagaError, setSagaError] = useState(null);
  const [showSagaLogs, setShowSagaLogs] = useState(false);
  const [pendingTasks, setPendingTasks] = useState(new Set());
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const loadTasks = async () => {
    try {
      setLoading(true);
      
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (searchTerm) params.search = searchTerm;
      
      const res = await api.get("/tasks/", { params });

      const data = Array.isArray(res.data)
        ? res.data
        : res.data.tasks || [];

      setTasks(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar las tareas");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (success, taskData, message) => {
    if (success) {
      setSagaError(null);
      
      if (taskData && taskData.id) {
        setPendingTasks(prev => new Set([...prev, taskData.id]));
        
        setTimeout(async () => {
          await loadTasks();
          setPendingTasks(prev => {
            const updated = new Set(prev);
            updated.delete(taskData.id);
            return updated;
          });
        }, 3000);
      }
      
      loadTasks();
    } else {
      setSagaError({
        type: "error",
        message: message || "Error al crear la tarea"
      });
      
      setTimeout(() => setSagaError(null), 8000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setCategoryFilter("");
    setPriorityFilter("");
  };

  useEffect(() => {
    loadTasks();
  }, [statusFilter, categoryFilter, priorityFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadTasks();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Stats
  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === "todo").length,
    doing: tasks.filter(t => t.status === "doing").length,
    done: tasks.filter(t => t.status === "done").length,
    highPriority: tasks.filter(t => t.priority === "Alta").length
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
      {/* AppBar with user info and logout */}
      <AppBar position="static" sx={{ 
        background: "linear-gradient(45deg, #667eea 30%, #764ba2 90%)",
        boxShadow: "0 3px 5px 2px rgba(102, 126, 234, .3)"
      }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: "bold" }}>
            Task Manager
          </Typography>
          
          <Chip 
            icon={<span>🐰</span>}
            label="RabbitMQ" 
            size="small" 
            sx={{ 
              mr: 2, 
              backgroundColor: "rgba(255,255,255,0.2)",
              color: "white",
              fontWeight: "bold"
            }}
          />
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body1" sx={{ display: { xs: "none", sm: "block" } }}>
              ¡Hola, {user?.name || "Usuario"}!
            </Typography>
            <IconButton
              size="large"
              edge="end"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem disabled>
                <Box>
                  <Typography variant="subtitle2">{user?.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
                </Box>
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
                Cerrar Sesión
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Welcome Message */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 3, 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: 2
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
            ¡Bienvenido/a, {user?.name}! 👋
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Gestiona tus tareas de manera eficiente con nuestro sistema basado en microservicios
          </Typography>
        </Paper>

        {/* Task Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Paper elevation={2} sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#667eea" }}>
                {taskStats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">Total</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={2} sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#3498db" }}>
                {taskStats.todo}
              </Typography>
              <Typography variant="body2" color="text.secondary">Por Hacer</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={2} sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#f39c12" }}>
                {taskStats.doing}
              </Typography>
              <Typography variant="body2" color="text.secondary">En Progreso</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={2} sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#27ae60" }}>
                {taskStats.done}
              </Typography>
              <Typography variant="body2" color="text.secondary">Completadas</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* RabbitMQ Monitor */}
        <RabbitMQMonitor />

        {/* SAGA Error Alert */}
        <Collapse in={sagaError !== null}>
          <Alert 
            severity={sagaError?.type === "rollback" ? "warning" : "error"}
            sx={{ mb: 2 }}
            onClose={() => setSagaError(null)}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
              {sagaError?.type === "rollback" ? "🔄 Rollback Ejecutado" : "❌ Error"}
            </Typography>
            <Typography variant="body2">
              {sagaError?.message}
            </Typography>
          </Alert>
        </Collapse>

        {/* SAGA Logs Panel */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => setShowSagaLogs(!showSagaLogs)}
          >
            {showSagaLogs ? "Ocultar" : "Ver"} Logs SAGA
          </Button>
        </Box>

        <Collapse in={showSagaLogs}>
          <SagaLogs />
        </Collapse>

        {/* Task Form */}
        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
            Crear Nueva Tarea
          </Typography>
          <TaskForm onCreated={handleTaskCreated} />
        </Paper>

        {/* Filters */}
        <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Mis Tareas
            </Typography>
            <Button
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              variant="outlined"
              size="small"
            >
              Filtros
            </Button>
          </Box>

          <Collapse in={showFilters}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Buscar"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Estado"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="todo">Por Hacer</MenuItem>
                    <MenuItem value="doing">Haciendo</MenuItem>
                    <MenuItem value="done">Hecho</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Categoría</InputLabel>
                  <Select
                    value={categoryFilter}
                    label="Categoría"
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <MenuItem value="">Todas</MenuItem>
                    <MenuItem value="Frontend">Frontend</MenuItem>
                    <MenuItem value="Backend">Backend</MenuItem>
                    <MenuItem value="Full Stack">Full Stack</MenuItem>
                    <MenuItem value="Product Owner">Product Owner</MenuItem>
                    <MenuItem value="Scrum">Scrum</MenuItem>
                    <MenuItem value="Mixto">Mixto</MenuItem>
                    <MenuItem value="QA">QA</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Prioridad</InputLabel>
                  <Select
                    value={priorityFilter}
                    label="Prioridad"
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <MenuItem value="">Todas</MenuItem>
                    <MenuItem value="Alta">Alta</MenuItem>
                    <MenuItem value="Media">Media</MenuItem>
                    <MenuItem value="Baja">Baja</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            {(searchTerm || statusFilter || categoryFilter || priorityFilter) && (
              <Box sx={{ mt: 2, textAlign: "right" }}>
                <Button size="small" onClick={clearFilters}>
                  Limpiar Filtros
                </Button>
              </Box>
            )}
          </Collapse>
        </Paper>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Empty State */}
        {!loading && !error && tasks.length === 0 && (
          <Paper elevation={2} sx={{ mt: 4, p: 4, textAlign: "center", borderRadius: 2 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No hay tareas que coincidan con los filtros
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {(statusFilter || categoryFilter || priorityFilter || searchTerm) 
                ? "Intenta ajustar los filtros" 
                : "Crea tu primera tarea usando el formulario de arriba"}
            </Typography>
          </Paper>
        )}

        {/* Tasks List */}
        <Box sx={{ mt: 3 }}>
          {!loading && tasks.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Chip 
                label={`${tasks.length} tarea${tasks.length !== 1 ? 's' : ''}`}
                color="primary"
                variant="outlined"
              />
              {pendingTasks.size > 0 && (
                <Chip 
                  label={`${pendingTasks.size} procesando...`}
                  color="warning" 
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          )}
          
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdate={loadTasks}
              isPending={pendingTasks.has(task.id)}
            />
          ))}
        </Box>
      </Container>
    </Box>
  );
}