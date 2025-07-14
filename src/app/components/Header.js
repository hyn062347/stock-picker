"use client"
import styles from "./Header.module.css"
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SearchBar() {
    const router = useRouter();
    const [ username, setUsername ] = useState(null);

    useEffect(() => {
        async function fetchUser() {
            try{
                const response = await fetch("api/auth/user");
                const data = await response.json();
                if(data.user){
                    setUsername(data.user);
                }
            }catch (error){
                console.error("Failed to fetch User", error);
            }
        }
        fetchUser();
    },[]);

    return (
        <div className={styles["headerContainer"]}>
            <p
                className={styles["title"]}
                onClick={() => router.push("/")}
            >Stock Picker</p>
            <p className={styles["user"]}
                onClick={() => router.push("/favorite")}>{username}</p>
        </div>
    );
}