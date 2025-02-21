"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "../page.module.css"

export default function SignInPage() {
    const [formData, setFormData] = useState({email: "", password: "" });
    const [error, setError] = useState("");
    const router = useRouter();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const res = await fetch(`/api/auth/signin`, {
                method: "POST",
                body: JSON.stringify(formData),
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Something went wrong");

            router.push("/"); // 회원가입 후 로그인 페이지로 이동 
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles["searchContainer"]}>
            <input
                type="email"
                value={formData.email}
                name="email"
                onChange={handleChange}
                placeholder="Email"
                className={styles["searchField"]}
            />
            <input
                type="password"
                value={formData.password}
                onChange={handleChange}
                name="password"
                className={styles["searchField"]}
            />
            <button type="submit" className={styles["searchButton"]}>
                Confirm
            </button>
        </form>
    );
}