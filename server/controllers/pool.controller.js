import {
  createPoolService,
  joinPoolService,
  getUserPoolsService,
} from "../services/pool.service.js";

export const createPool = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { poolname, pooldescription } = req.body;

    const pool = await createPoolService({
      poolname,
      pooldescription,
      userId,
    });

    res.status(201).json({
      message: "Pool created successfully",
      pool,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const joinPool = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { joincode } = req.body;

    const pool = await joinPoolService({ joincode, userId });

    res.status(200).json({
      message: "Joined pool successfully",
      pool,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getUserPools = async (req, res) => {
  try {
    const userId = req.user.userId;

    const pools = await getUserPoolsService(userId);

    res.status(200).json({
      pools,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

