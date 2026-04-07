import API from "./api";

export const loginUser = async (username, password) => {
  const response = await API.post("/login", {
    username,
    password
  });

  return response.data;
};