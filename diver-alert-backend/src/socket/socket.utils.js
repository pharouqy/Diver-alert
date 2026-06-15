/**
 * src/socket/socket.utils.js
 */

/**
 * @param {Map} connectedDivers
 * @returns {Array<{ userId, name, role, position, radius }>}
 */
const getActiveDivers = (connectedDivers) =>
  Array.from(connectedDivers.entries()).map(([userId, data]) => ({
    userId,
    name:     data.name,
    role:     data.role,
    position: data.position,
    radius:   data.radius,
  }));

module.exports = { getActiveDivers };