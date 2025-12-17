import { useEffect, useState } from "react";
import api from "../api/api";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  Alert,
  IconButton,
  Tooltip
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

export default function SagaLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/tasks/saga-logs");
      setLogs(res.data || []);
    } catch (err) {
      console.error("Error loading SAGA logs:", err);
      setError("No se pudieron cargar los logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      "STARTED": "info",
      "TASK_CREATED": "primary",
      "COMPLETED": "success",
      "COMPENSATED": "warning",
      "FAILED": "error",
      "COMPENSATION_FAILED": "error"
    };
    return colors[status] || "default";
  };

  const getStatusIcon = (status) => {
    const icons = {
      "STARTED": "🔵",
      "TASK_CREATED": "📝",
      "COMPLETED": "✅",
      "COMPENSATED": "🔄",
      "FAILED": "❌",
      "COMPENSATION_FAILED": "💥"
    };
    return icons[status] || "•";
  };

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString("es-CO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return timestamp;
    }
  };

  // Agrupar logs por saga_id
  const groupedLogs = logs.reduce((acc, log) => {
    if (!acc[log.saga_id]) {
      acc[log.saga_id] = [];
    }
    acc[log.saga_id].push(log);
    return acc;
  }, {});

  return (
    <Paper sx={{ p: 2, mb: 3, backgroundColor: "#f5f5f5" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">
          📊 Historial de SAGAs
        </Typography>
        <Tooltip title="Actualizar logs">
          <IconButton size="small" onClick={loadLogs} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={30} />
        </Box>
      )}

      {error && (
        <Alert severity="error">{error}</Alert>
      )}

      {!loading && !error && logs.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
          No hay logs de SAGA todavía. Crea una tarea para ver el historial.
        </Typography>
      )}

      {!loading && !error && Object.keys(groupedLogs).length > 0 && (
        <Box sx={{ maxHeight: "400px", overflowY: "auto" }}>
          {Object.entries(groupedLogs).slice(0, 10).map(([sagaId, sagaLogs]) => {
            const lastStatus = sagaLogs[sagaLogs.length - 1]?.status;
            const isRollback = lastStatus === "COMPENSATED";
            
            return (
              <Paper 
                key={sagaId} 
                sx={{ 
                  p: 2, 
                  mb: 1.5, 
                  backgroundColor: "white",
                  borderLeft: `4px solid ${isRollback ? "#ff9800" : "#4caf50"}`
                }}
                elevation={1}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
                    {sagaId}
                  </Typography>
                  <Chip 
                    label={isRollback ? "ROLLBACK" : "EXITOSO"}
                    size="small"
                    color={isRollback ? "warning" : "success"}
                    sx={{ fontSize: "0.7rem" }}
                  />
                </Box>

                {sagaLogs.map((log, idx) => (
                  <Box 
                    key={idx} 
                    sx={{ 
                      display: "flex", 
                      alignItems: "flex-start", 
                      gap: 1.5,
                      py: 0.5,
                      borderLeft: idx < sagaLogs.length - 1 ? "2px solid #e0e0e0" : "none",
                      ml: 1,
                      pl: 2,
                      position: "relative"
                    }}
                  >
                    <Box sx={{ 
                      position: "absolute", 
                      left: -6, 
                      top: 6,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      backgroundColor: "white",
                      border: "2px solid #e0e0e0"
                    }} />

                    <Typography sx={{ fontSize: "0.9rem", minWidth: "20px" }}>
                      {getStatusIcon(log.status)}
                    </Typography>
                    
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 0.5 }}>
                        <Chip 
                          label={log.status}
                          size="small"
                          color={getStatusColor(log.status)}
                          sx={{ fontSize: "0.65rem", height: "20px" }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(log.timestamp)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                        {log.details}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Paper>
            );
          })}
        </Box>
      )}

      <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #e0e0e0" }}>
        <Typography variant="caption" color="text.secondary">
          💡 Los logs muestran el flujo completo de cada operación SAGA, incluyendo rollbacks automáticos.
        </Typography>
      </Box>
    </Paper>
  );
}