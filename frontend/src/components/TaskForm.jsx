import { useState } from "react";
import api from "../api/api";
import { TextField, Button, Box } from "@mui/material";

export default function TaskForm({ onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!title) return;

    await api.post("/tasks/", {
      title,
      description
    });

    setTitle("");
    setDescription("");
    onCreated();
  };

  return (
    <Box sx={{ display: "flex", gap: 2, marginTop: 2 }}>
      <TextField
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        fullWidth
      />
      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        fullWidth
      />
      <Button variant="contained" onClick={handleSubmit}>
        Add
      </Button>
    </Box>
  );
}
