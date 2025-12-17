import { useState } from "react";
import api from "../api/api";
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Box,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CodeIcon from "@mui/icons-material/Code";

const statusColors = {
  todo: "#3498db",
  doing: "#f39c12",
  done: "#27ae60"
};

const statusLabels = {
  todo: "Por Hacer",
  doing: "Haciendo",
  done: "Hecho"
};

const priorityColors = {
  Alta: "error",
  Media: "warning",
  Baja: "success"
};

const categoryColors = {
  Frontend: "#61dafb",
  Backend: "#68a063",
  "Full Stack": "#764ba2",
  "Product Owner": "#e67e22",
  Scrum: "#9b59b6",
  Mixto: "#34495e",
  QA: "#16a085"
};

export default function TaskCard({ task, onUpdate, isPending = false }) {
  const [deleting, setDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    title: task.title,
    description: task.description || "",
    status: task.status,
    category: task.category,
    priority: task.priority
  });

  const deleteTask = async () => {
    if (!window.confirm("¿Estás seguro de eliminar esta tarea?")) {
      return;
    }

    try {
      setDeleting(true);
      await api.delete(`/tasks/${task.id}`);
      onUpdate();
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Error al eliminar la tarea");
    } finally {
      setDeleting(false);
    }
  };

  const updateTask = async () => {
    try {
      await api.put(`/tasks/${task.id}`, editData);
      setEditDialogOpen(false);
      onUpdate();
    } catch (err) {
      console.error("Error updating task:", err);
      alert("Error al actualizar la tarea");
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Card 
        sx={{ 
          mb: 2,
          transition: "all 0.3s",
          opacity: isPending ? 0.7 : 1,
          borderLeft: `5px solid ${statusColors[task.status]}`,
          "&:hover": {
            boxShadow: 6,
            transform: "translateY(-4px)"
          }
        }}
      >
        {isPending && (
          <LinearProgress 
            sx={{ 
              height: 3,
              backgroundColor: "#fff3e0",
              "& .MuiLinearProgress-bar": {
                backgroundColor: "#ff9800"
              }
            }} 
          />
        )}
        
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
                  {task.title}
                </Typography>
                
                {isPending ? (
                  <Tooltip title="Procesando notificación...">
                    <HourglassEmptyIcon sx={{ color: "warning.main", fontSize: 18 }} />
                  </Tooltip>
                ) : (
                  <Tooltip title="Confirmado">
                    <CheckCircleIcon sx={{ color: "success.main", fontSize: 18 }} />
                  </Tooltip>
                )}
              </Box>
              
              {task.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {task.description}
                </Typography>
              )}

              <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", mb: 1 }}>
                <Chip 
                  label={statusLabels[task.status]}
                  size="small"
                  sx={{ 
                    backgroundColor: statusColors[task.status],
                    color: "white",
                    fontWeight: "bold"
                  }}
                />
                
                <Chip 
                  label={task.category}
                  size="small"
                  sx={{ 
                    backgroundColor: categoryColors[task.category] || "#95a5a6",
                    color: "white"
                  }}
                />
                
                <Chip 
                  label={task.priority}
                  size="small"
                  color={priorityColors[task.priority]}
                  variant="outlined"
                />

                <Tooltip title={`Código: ${task.code}`}>
                  <Chip 
                    icon={<CodeIcon />}
                    label={task.code}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: "monospace" }}
                  />
                </Tooltip>
              </Box>

              <Typography variant="caption" color="text.secondary">
                Creada: {formatDate(task.created_at)}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="Editar">
                <IconButton 
                  color="primary" 
                  onClick={() => setEditDialogOpen(true)}
                  disabled={isPending}
                  size="small"
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Eliminar">
                <IconButton 
                  color="error" 
                  onClick={deleteTask}
                  disabled={deleting || isPending}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Tarea</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Título"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                multiline
                rows={3}
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={editData.status}
                  label="Estado"
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                >
                  <MenuItem value="todo">Por Hacer</MenuItem>
                  <MenuItem value="doing">Haciendo</MenuItem>
                  <MenuItem value="done">Hecho</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={editData.category}
                  label="Categoría"
                  onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                >
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

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Prioridad</InputLabel>
                <Select
                  value={editData.priority}
                  label="Prioridad"
                  onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                >
                  <MenuItem value="Alta">Alta</MenuItem>
                  <MenuItem value="Media">Media</MenuItem>
                  <MenuItem value="Baja">Baja</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={updateTask} 
            variant="contained"
            sx={{
              background: "linear-gradient(45deg, #667eea 30%, #764ba2 90%)"
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}