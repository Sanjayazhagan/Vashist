export const createChatService = async ({ userId, poolId, title }) => {
  // check user is part of pool
  const memberCheck = await pool.query(
    "SELECT 1 FROM poolmembers WHERE userid = $1 AND poolid = $2",
    [userId, poolId],
  );

  if (memberCheck.rows.length === 0) {
    throw new Error("You are not a member of this pool");
  }

  // create chat
  const result = await pool.query(
    `INSERT INTO chat (userid, poolid, title)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, poolId, title],
  );

  return result.rows[0];
};

export const getChatsService = async (userId) => {
  const result = await pool.query("SELECT * FROM chat WHERE userid = $1", [
    userId,
  ]);

  return result.rows;
};

export const getChatHistoryService = async (chatId, userId) => {
  // verify ownership
  const chatCheck = await pool.query(
    "SELECT * FROM chat WHERE id = $1 AND userid = $2",
    [chatId, userId],
  );

  if (chatCheck.rows.length === 0) {
    throw new Error("Chat not found");
  }

  const result = await pool.query(
    "SELECT * FROM qa WHERE groupid = $1 ORDER BY id ASC",
    [chatId],
  );

  return result.rows;
};

export const askQuestionService = async ({ chatId, userId, question }) => {
  // 1. verify chat ownership
  const chatRes = await pool.query(
    "SELECT * FROM chat WHERE id = $1 AND userid = $2",
    [chatId, userId],
  );

  if (chatRes.rows.length === 0) {
    throw new Error("Chat not found");
  }

  const poolId = chatRes.rows[0].poolid;

  // 2. get user tokens
  const tokenRes = await pool.query(
    "SELECT * FROM tokens WHERE userid = $1 AND poolid = $2",
    [userId, poolId],
  );

  const userToken = tokenRes.rows[0];

  if (!userToken) {
    throw new Error("Token record not found");
  }

  // 3. check expiry
  if (userToken.expiresat && new Date(userToken.expiresat) < new Date()) {
    throw new Error("Tokens expired");
  }

  // 4. check balance
  if (userToken.tokens <= 0) {
    throw new Error("Not enough tokens");
  }

  // 5. deduct token
  await pool.query(
    "UPDATE tokens SET tokens = tokens - 1 WHERE userid = $1 AND poolid = $2",
    [userId, poolId],
  );

  // 6. dummy answer (AI later)
  const answer = "This is a placeholder answer";

  // 7. store Q&A
  const qaRes = await pool.query(
    `INSERT INTO qa (groupid, question, answer)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [chatId, question, answer],
  );

  return qaRes.rows[0];
};


