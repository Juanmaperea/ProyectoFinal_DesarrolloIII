import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { 
  Button, 
  TextField, 
  Container, 
  Typography, 
  Alert,
  Box 
} from "@mui/material";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setError("");
      setLoading(true);
      
      const res = await api.post("/login", { email, password });
      login(res.data.access_token);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      
      if (err.response?.status === 401) {
        setError("Invalid email or password");
      } else if (err.response?.status === 500) {
        setError("Server error. Please try again later.");
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Login
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField 
        fullWidth 
        label="Email" 
        type="email"
        margin="normal"
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={loading}
      />
      
      <TextField 
        fullWidth 
        label="Password" 
        type="password" 
        margin="normal"
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
        disabled={loading}
      />
      
      <Button 
        fullWidth 
        variant="contained" 
        onClick={handleSubmit}
        sx={{ mt: 2 }}
        disabled={loading || !email || !password}
      >
        {loading ? "Logging in..." : "Login"}
      </Button>

      <Box sx={{ mt: 2, textAlign: "center" }}>
        <Typography variant="body2">
          Don't have an account?{" "}
          <Link to="/register" style={{ textDecoration: "none" }}>
            Register here
          </Link>
        </Typography>
      </Box>
    </Container>
  );
}