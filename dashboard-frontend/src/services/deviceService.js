import API from "./api";

export const getDevices = async () => {
  const response = await API.get("/devices");
  return response.data;
};