import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { axiosInstance } from "../api/axiosInstance";

interface Login {
  email: string;
  password: string;
}

interface SignUp {
  name: string;
  email: string;
  password: string;
  confirmPass: string;
}

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState<Login>({
    email: "",
    password: "",
  });
  const [signUpForm, setSignUpForm] = useState<SignUp>({
    name: "",
    email: "",
    password: "",
    confirmPass: "",
  });

  // Handle input changes
  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignUpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignUpForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Login
  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      toast.error("Email and password are required!");
      return;
    }

    try {
      setLoading(true);
      const res = await axiosInstance.post("/user/login", loginForm);
      if (res.status === 200) {
        toast.success("Login successful!");
        navigate("/dashboard", {
          state: { userId: res.data._id, name: res.data.name },
        });
        setLoginForm({ email: "", password: "" });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Login failed!");
    } finally {
      setLoading(false);
    }
  };

  // Handle SignUp
  const handleSignUp = async () => {
    const { name, email, password, confirmPass } = signUpForm;

    if (!name || !email || !password || !confirmPass) {
      toast.error("All fields are required!");
      return;
    }
    if (password !== confirmPass) {
      toast.error("Passwords do not match!");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long!");
      return;
    }

    try {
      setLoading(true);
      const res = await axiosInstance.post("/user/signup", {
        name,
        email,
        password,
      });

      if (res.status === 201 || res.status === 200) {
        toast.success("Signup successful! Please login.");
        setIsLogin(true);
        setSignUpForm({
          name: "",
          email: "",
          password: "",
          confirmPass: "",
        });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Signup failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex justify-center items-center w-screen h-screen bg-gray-50 px-4">
      <ToastContainer position="top-right" autoClose={3000} theme="light" />

      <div className="shadow-lg bg-white py-8 px-8 sm:px-10 rounded-lg flex flex-col gap-y-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center">
          {isLogin ? "Welcome Back 👋" : "Create an Account"}
        </h2>

        {isLogin ? (
          <>
            {/* Email */}
            <div className="flex flex-col gap-y-2">
              <p>Email*</p>
              <input
                type="email"
                required
                placeholder="Enter your email"
                className="outline-none bg-gray-100 p-2 rounded-sm"
                name="email"
                value={loginForm.email}
                onChange={handleLoginInputChange}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-y-2">
              <p>Password*</p>
              <input
                type="password"
                placeholder="Enter your password"
                className="outline-none bg-gray-100 p-2 rounded-sm"
                name="password"
                value={loginForm.password}
                onChange={handleLoginInputChange}
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4">
              <button
                onClick={handleLogin}
                disabled={loading}
                className={`text-white font-semibold bg-blue-500 px-5 py-2 rounded-md transition hover:bg-blue-600 disabled:opacity-60`}
              >
                {loading ? "Logging in..." : "Login"}
              </button>
              <button
                className="text-blue-500 hover:underline"
                onClick={() => setIsLogin(false)}
              >
                New user? Register
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Name */}
            <div className="flex flex-col gap-y-2">
              <p>Full Name*</p>
              <input
                type="text"
                required
                placeholder="Your name"
                className="outline-none bg-gray-100 p-2 rounded-sm"
                name="name"
                value={signUpForm.name}
                onChange={handleSignUpInputChange}
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-y-2">
              <p>Email*</p>
              <input
                type="email"
                required
                placeholder="Enter your email"
                className="outline-none bg-gray-100 p-2 rounded-sm"
                name="email"
                value={signUpForm.email}
                onChange={handleSignUpInputChange}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-y-2">
              <p>Password*</p>
              <input
                type="password"
                placeholder="Create password"
                className="outline-none bg-gray-100 p-2 rounded-sm"
                name="password"
                value={signUpForm.password}
                onChange={handleSignUpInputChange}
              />
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-y-2">
              <p>Confirm Password*</p>
              <input
                type="password"
                placeholder="Confirm password"
                className="outline-none bg-gray-100 p-2 rounded-sm"
                name="confirmPass"
                value={signUpForm.confirmPass}
                onChange={handleSignUpInputChange}
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4">
              <button
                onClick={handleSignUp}
                disabled={loading}
                className={`text-white font-semibold bg-blue-500 px-5 py-2 rounded-md transition hover:bg-blue-600 disabled:opacity-60`}
              >
                {loading ? "Signing up..." : "Sign Up"}
              </button>
              <button
                className="text-blue-500 hover:underline"
                onClick={() => setIsLogin(true)}
              >
                Existing user? Login
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
