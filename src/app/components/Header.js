"use client"
import styles from "./Header.module.css"
import { useRouter } from "next/navigation";

export default function SearchBar() {
    const router = useRouter();

    return (
        <div className={styles["headerContainer"]}>
            <p
                className={styles["title"]}
                onClick={() => router.push("/")}
            >Stock Picker</p>
        </div>
    );
}