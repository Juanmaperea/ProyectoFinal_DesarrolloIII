import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Grid,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

export default function RabbitMQMonitor() {
  const [expanded, setExpanded] = useState(false);
  const [stats, setStats] = useState({
    taskEvents: { published: 0, consumed: 0 },
    notificationEvents: { published: 0, consumed: 0 },
    pendingMessages: 0
  });

  // En una implementación real, estos datos vendrían de la API de RabbitMQ
  // Para este ejemplo, simularemos los stats
  const refreshStats = () => {
    // Simular stats (en producción, esto vendría de RabbitMQ Management API)
    setStats({
      taskEvents: { 
        published: Math.floor(Math.random() * 100), 
        consumed: Math.floor(Math.random() * 100) 
      },
      notificationEvents: { 
        published: Math.floor(Math.random() * 100), 
        consumed: Math.floor(Math.random() * 100) 
      },
      pendingMessages: Math.floor(Math.random() * 5)
    });
  };

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 3, 
        backgroundColor: "#f5f5f5",
        borderLeft: "4px solid #ff9800"
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <span style={{ fontSize: "1.5rem" }}>🐰</span>
          <Typography variant="h6">
            RabbitMQ Status
          </Typography>
          <Chip 
            label="Connected" 
            size="small" 
            color="success"
            sx={{ fontSize: "0.7rem" }}
          />
        </Box>
        
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Actualizar estadísticas">
            <IconButton size="small" onClick={refreshStats}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            {/* Task Events Exchange */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, backgroundColor: "white" }} elevation={1}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    📤 task_events
                  </Typography>
                  <Chip label="Exchange" size="small" variant="outlined" />
                </Box>
                
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Eventos de tareas creadas
                  </Typography>
                </Box>
                
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="body2">Publicados</Typography>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    {stats.taskEvents.published}
                  </Typography>
                </Box>
                
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">Consumidos</Typography>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    {stats.taskEvents.consumed}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Notification Events Exchange */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, backgroundColor: "white" }} elevation={1}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    📥 notification_events
                  </Typography>
                  <Chip label="Exchange" size="small" variant="outlined" />
                </Box>
                
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Confirmaciones y fallos de notificaciones
                  </Typography>
                </Box>
                
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="body2">Publicados</Typography>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    {stats.notificationEvents.published}
                  </Typography>
                </Box>
                
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">Consumidos</Typography>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    {stats.notificationEvents.consumed}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Pending Messages */}
            <Grid item xs={12}>
              <Paper 
                sx={{ 
                  p: 2, 
                  backgroundColor: stats.pendingMessages > 0 ? "#fff3e0" : "white" 
                }} 
                elevation={1}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    ⏳ Mensajes Pendientes
                  </Typography>
                  <Chip 
                    label={stats.pendingMessages}
                    size="small"
                    color={stats.pendingMessages > 0 ? "warning" : "success"}
                  />
                </Box>
                
                {stats.pendingMessages > 0 && (
                  <>
                    <LinearProgress 
                      variant="determinate" 
                      value={(stats.pendingMessages / 10) * 100}
                      sx={{ mb: 1, height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Hay mensajes en cola esperando ser procesados por los servicios
                    </Typography>
                  </>
                )}
                
                {stats.pendingMessages === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    ✅ Todas las colas están vacías - procesamiento al día
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Info Box */}
          <Box sx={{ mt: 2, p: 1.5, backgroundColor: "#e3f2fd", borderRadius: 1 }}>
            <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
              <strong>💡 Arquitectura de Coreografía:</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              • Los servicios se comunican mediante eventos publicados en exchanges<br/>
              • Cada servicio escucha los eventos que le interesan desde sus queues<br/>
              • No hay dependencias directas entre servicios (desacoplamiento total)<br/>
              • Los mensajes persisten en RabbitMQ hasta ser procesados<br/>
              • Si un servicio falla, los mensajes esperan hasta que se recupere
            </Typography>
          </Box>

          {/* Quick Access */}
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              🔗 Accede al panel completo de RabbitMQ en{" "}
              <a 
                href="http://localhost:15672" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: "#ff9800", textDecoration: "none" }}
              >
                localhost:15672
              </a>
              {" "}(taskuser / taskpass)
            </Typography>
          </Box>
        </Box>
      </Collapse>

      {!expanded && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Click para ver estadísticas detalladas de RabbitMQ
          </Typography>
        </Box>
      )}
    </Paper>
  );
}