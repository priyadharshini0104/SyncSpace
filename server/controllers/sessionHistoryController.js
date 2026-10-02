// Session History REST APIs and Snapshot Persistence (Member 6)
const sessionHistoryStore = new Map();

exports.saveSessionSnapshot = async (req, res) => {
  try {
    const { sessionId, snapshotData, author } = req.body;
    if (!sessionId || !snapshotData) {
      return res.status(400).json({ error: 'sessionId and snapshotData are required' });
    }

    if (!sessionHistoryStore.has(sessionId)) {
      sessionHistoryStore.set(sessionId, []);
    }

    const snapshotEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      author: author || 'anonymous',
      data: snapshotData
    };

    sessionHistoryStore.get(sessionId).push(snapshotEntry);

    return res.status(201).json({
      success: true,
      message: 'Snapshot archived successfully',
      snapshot: snapshotEntry
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error recording snapshot' });
  }
};

exports.getSessionHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = sessionHistoryStore.get(sessionId) || [];
    return res.status(200).json({
      sessionId,
      totalSnapshots: history.length,
      history
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error retrieving history' });
  }
};