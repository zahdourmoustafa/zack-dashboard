import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// Basic styling for the component - consider moving to a CSS file for larger applications
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh', // Take up most of the viewport height
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '420px',
    textAlign: 'center',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '20px',
    color: '#555',
    marginBottom: '30px',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  inputGroup: {
    textAlign: 'left',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    color: '#444',
    marginBottom: '5px',
  },
  input: {
    width: '100%',
    padding: '12px 15px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxSizing: 'border-box',
    fontSize: '16px',
  },
  button: {
    backgroundColor: '#007bff', // A nice blue
    color: 'white',
    padding: '12px 15px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s ease',
  },
  buttonHover: { // Example: for hover, though inline styles don't directly support pseudo-classes
    backgroundColor: '#0056b3',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#007bff',
    cursor: 'pointer',
    fontSize: '14px',
    marginTop: '20px',
    textDecoration: 'underline',
  },
  message: {
    marginTop: '15px',
    padding: '10px',
    borderRadius: '6px',
    textAlign: 'center',
  },
  successMessage: {
    backgroundColor: '#e6fffa',
    color: '#00796b',
  },
  errorMessage: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
};

const AuthComponent: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Sign In and Sign Up
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setMessage(
          "Sign up successful! Please check your email to confirm your account."
        );
        console.log("Sign up response:", data);
      } else {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });
        if (signInError) throw signInError;
        setMessage("Sign in successful!");
        console.log("Sign in response:", data);
        // Session is automatically handled by supabase-js, App.tsx will react to auth state change
      }
    } catch (err: any) {
      console.error("Authentication error:", err.message);
      setError(err.message || "An unexpected error occurred.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome to PNCPrintDashboard</h1>
        <h2 style={styles.subtitle}>{isSignUp ? 'Create Your Account' : 'Sign In to Your Account'}</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="you@example.com"
            />
          </div>
          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            style={styles.button}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = styles.buttonHover.backgroundColor!)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = styles.button.backgroundColor!)}
          >
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>
        <button 
          onClick={() => {
            setIsSignUp(!isSignUp);
            setMessage('');
            setError('');
          }} 
          disabled={loading} 
          style={styles.toggleButton}
        >
          {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
        </button>
        {message && <p style={{...styles.message, ...styles.successMessage}}>{message}</p>}
        {error && <p style={{...styles.message, ...styles.errorMessage}}>Error: {error}</p>}
      </div>
    </div>
  );
};

export default AuthComponent;
