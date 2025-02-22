"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./page.module.css"

export default function SignUpPage() {
    const [formData, setFormData] = useState({ username: "", email: "", password: "", passwordConfirm: "" });
    const [error, setError] = useState("");
    const [flag, setFlag] = useState(0);
    const router = useRouter();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        if (name === "password" || name === "passwordConfirm") {
            setFlag(formData.password !== value ? 1 : 0);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (flag !== 0) return;

        setError("");

        try {
            const res = await fetch(`/api/auth/signup`, {
                method: "POST",
                body: JSON.stringify(formData),
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Something went wrong");

            router.push("/signin");
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className={styles["signUpContainer"]}>
            <h1 className={styles["signUpTitle"]}>Sign Up</h1>
            <form onSubmit={handleSubmit} className={styles["signUpForm"]}>
                <input
                    type="text"
                    value={formData.username}
                    name="username"
                    onChange={handleChange}
                    placeholder="Username"
                    className={styles["signUpField"]}
                />
                <input
                    type="email"
                    value={formData.email}
                    name="email"
                    onChange={handleChange}
                    placeholder="Email"
                    className={styles["signUpField"]}
                />
                <input
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    name="password"
                    placeholder="Password"
                    className={styles["signUpField"]}
                />
                <input
                    type="password"
                    value={formData.passwordConfirm}
                    onChange={handleChange}
                    name="passwordConfirm"
                    placeholder="Password Confirm"
                    className={`${styles["signUpField"]} ${flag ? styles["errorField"] : ""}`}
                />
                <div className={styles["buttonContainer"]}>
                    <button type="button"
                        className={styles["cancelButton"]}
                        onClick={() => router.push("/")}>
                        Cancel
                    </button>
                    <button type="submit" className={styles["signUpButton"]} disabled={flag !== 0}>
                        Confirm
                    </button>
                </div>
            </form>
        </div>
    );
}
