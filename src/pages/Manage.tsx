import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Manage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Lists as the default manage page
    navigate("/manage/lists", { replace: true });
  }, [navigate]);

  return null;
}
