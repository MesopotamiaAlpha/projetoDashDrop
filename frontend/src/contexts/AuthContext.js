import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api'; // Ensure your backend API URL is correct

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            // Fetch user profile to validate token and get user info
            axios.get(`${API_URL}/users/me`)
                .then(response => {
                    setCurrentUser(response.data);
                })
                .catch(error => {
                    console.error("Failed to fetch user with token:", error);
                    localStorage.removeItem('authToken');
                    delete axios.defaults.headers.common['Authorization'];
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (nome_usuario, senha) => {
        try {
            const response = await axios.post(`${API_URL}/auth/login`, { nome_usuario, senha });
            const { token, user } = response.data;
            localStorage.setItem('authToken', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setCurrentUser(user);
            return user;
        } catch (error) {
            console.error("Login failed:", error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error('Login failed');
        }
    };

    const register = async (userData) => {
        try {
            const response = await axios.post(`${API_URL}/auth/register`, userData);
            // Optionally log in the user directly after registration or redirect to login
            return response.data;
        } catch (error) {
            console.error("Registration failed:", error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error('Registration failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        delete axios.defaults.headers.common['Authorization'];
        setCurrentUser(null);
        // Consider redirecting to login page here or in the component that calls logout
    };

    const value = {
        currentUser,
        login,
        register,
        logout,
        loading // Expose loading state so PrivateRoute can use it
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children} {/* Don't render children until loading is false */}
        </AuthContext.Provider>
    );
};

export default AuthProvider;

