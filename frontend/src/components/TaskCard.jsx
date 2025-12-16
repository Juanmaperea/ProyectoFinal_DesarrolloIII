import api from "../api/api";
import { Card, CardContent, Typography, Button } from "@mui/material";

export default function TaskCard({ task, onUpdate }) {
  const deleteTask = async () => {
    await api.delete(`/tasks/${task.id}`);
    onUpdate();
  };

  return (
    <Card sx={{ marginTop: 2 }}>
      <CardContent>
        <Typography variant="h6">{task.title}</Typography>
        <Typography>{task.description}</Typography>
        <Button color="error" onClick={deleteTask}>Delete</Button>
      </CardContent>
    </Card>
  );
}
