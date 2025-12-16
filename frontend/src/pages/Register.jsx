import { useState } from "react";
import api from "../api/api";
import { Button, TextField, Container, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    await api.post("/register", { email, password });
    navigate("/");
  };

  return (
    <Container maxWidth="xs">
      <Typography variant="h4" sx={{ marginBottom: 2 }}>
        Register
      </Typography>

      <TextField
        fullWidth
        label="Email"
        margin="normal"
        onChange={(e) => setEmail(e.target.value)}
      />

      <TextField
        fullWidth
        label="Password"
        type="password"
        margin="normal"
        onChange={(e) => setPassword(e.target.value)}
      />

      <Button
        fullWidth
        variant="contained"
        sx={{ marginTop: 2 }}
        onClick={handleSubmit}
      >
        Register
      </Button>
    </Container>
  );
}
