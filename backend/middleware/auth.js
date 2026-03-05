const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'ログインが必要です。再度ログインしてください。' });
  }
};

module.exports = { requireAuth };
