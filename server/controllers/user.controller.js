import {
  getDashboardService,
  getPoolDetailsService,
} from "../services/user.service.js";

export const getDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    const data = await getDashboardService(userId);

    res.status(200).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


export const getPoolDetails = async (req, res) => {
  try {
    const userId = req.user.userId;
    const poolId = req.params.poolId;

    const data = await getPoolDetailsService(userId, poolId);

    res.status(200).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};