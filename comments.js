// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Comments
const commentsByPostId = {};

// Routes
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Posts
app.post('/posts/:id/comments', async (req, res) => {
  // Generate random id for comment
  const commentId = randomBytes(4).toString('hex');
  // Get content from request body
  const { content } = req.body;
  // Get comments for post
  const comments = commentsByPostId[req.params.id] || [];
  // Add new comment to post
  comments.push({ id: commentId, content, status: 'pending' });
  // Update comments for post
  commentsByPostId[req.params.id] = comments;
  // Emit event to Event Bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });
  // Send response
  res.status(201).send(comments);
});

// Events
app.post('/events', async (req, res) => {
  // Get event from request body
  const { type, data } = req.body;
  // Log event
  console.log('Event Received:', type);
  // Handle events
  if (type === 'CommentModerated') {
    // Get comment from comments
    const { id, postId, status, content } = data;
    const comments = commentsByPostId[postId];
    const comment = comments.find((comment) => comment.id === id);
    // Update comment status
    comment.status = status;
    // Emit event to Event Bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { id, postId, status, content },
    });
  }
  // Send response
  res.send({});
});

// Listen
app.listen(4001, () => {
  console.log('Listening