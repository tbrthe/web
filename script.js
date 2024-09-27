window.addEventListener('DOMContentLoaded', (event) => {
  // Obtener estadísticas en tiempo real
  fetch('/stats')
    .then(response => response.json())
    .then(data => {
      document.getElementById('usersCount').textContent = data.stats.usersCount;
      document.getElementById('totalBalance').textContent = `${data.stats.totalBalance} Satoshis`;
    })
    .catch(error => console.error('Error al cargar estadísticas:', error));
});
