import { useEffect, useState } from "react";
import api from "../api/api";
import {
  Container,
  Typography,
  CircularProgress,
  Box,
  Alert
} from "@mui/material";
import TaskCard from "../components/TaskCard";
import TaskForm from "../components/TaskForm";

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tasks/");

      // 🛡️ Protección contra respuestas incorrectas
      const data = Array.isArray(res.data)
        ? res.data
        : res.data.tasks || [];

      setTasks(data);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar las tareas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Tasks
      </Typography>

      <TaskForm onCreated={loadTasks} />

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && tasks.length === 0 && (
        <Typography sx={{ mt: 3 }} color="text.secondary">
          You have no tasks yet
        </Typography>
      )}

      <Box sx={{ mt: 3 }}>
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onUpdate={loadTasks}
          />
        ))}
      </Box>
    </Container>
  );
}
