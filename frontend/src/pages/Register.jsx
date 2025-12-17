import { useState } from "react";
import api from "../api/api";
import { 
  Button, 
  TextField, 
  Container, 
  Typography, 
  Alert,
  Box,
  Paper
} from "@mui/material";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      setError("");
      setLoading(true);
      
      await api.post("/register", { name, email, password });
      
      setSuccess(true);
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      console.error("Register error:", err.response?.data || err.message);
      
      if (err.response?.status === 400) {
        setError("User already exists");
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      py: 4
    }}>
      <Container maxWidth="xs">
        <Paper elevation={10} sx={{ p: 4, borderRadius: 3 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              mb: 3, 
              textAlign: "center",
              fontWeight: "bold",
              background: "linear-gradient(45deg, #667eea 30%, #764ba2 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            Create Account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Registration successful! Redirecting to login...
            </Alert>
          )}

          <TextField
            fullWidth
            label="Full Name"
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading || success}
            variant="outlined"
          />

          <TextField
            fullWidth
            label="Email"
            type="email"
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || success}
            variant="outlined"
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={loading || success}
            variant="outlined"
          />

          <Button
            fullWidth
            variant="contained"
            sx={{ 
              mt: 3,
              py: 1.5,
              background: "linear-gradient(45deg, #667eea 30%, #764ba2 90%)",
              boxShadow: "0 3px 5px 2px rgba(102, 126, 234, .3)",
              "&:hover": {
                background: "linear-gradient(45deg, #5568d3 30%, #6a3f8f 90%)",
              }
            }}
            onClick={handleSubmit}
            disabled={loading || success || !name || !email || !password}
          >
            {loading ? "Registering..." : "Register"}
          </Button>

          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{" "}
              <Link to="/" style={{ 
                textDecoration: "none", 
                color: "#667eea",
                fontWeight: "bold"
              }}>
                Login here
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}