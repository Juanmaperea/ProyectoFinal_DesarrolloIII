import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { Button, TextField, Container, Typography } from "@mui/material";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    const res = await api.post("/login", { email, password });
    login(res.data.access_token);

    navigate("/dashboard");
  };

  return (
    <Container maxWidth="xs">
      <Typography variant="h4">Login</Typography>
      <TextField fullWidth label="Email" onChange={e => setEmail(e.target.value)} />
      <TextField fullWidth label="Password" type="password" onChange={e => setPassword(e.target.value)} />
      <Button fullWidth variant="contained" onClick={handleSubmit}>
        Login
      </Button>
    </Container>
  );
}
