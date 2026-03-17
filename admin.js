async function fetchSubmissions() {
    // CHANGE THIS URL TO YOUR LIVE BACKEND URL AFTER DEPLOYMENT
    const response = await fetch('http://localhost:3000/api/submissions');
    const data = await response.json();
    
    const tbody = document.getElementById('table-body');
    data.forEach(row => {
        const tr = document.createElement('tr');
        let formattedData = "Error parsing data";
        try {
            formattedData = JSON.stringify(JSON.parse(row.full_data), null, 2);
        } catch (e) {}

        tr.innerHTML = `
            <td>${row._id}</td>
            <td><strong>${row.student_name}</strong></td>
            <td>${row.aadhar}</td>
            <td>${new Date(row.timestamp).toLocaleString()}</td>
            <td><pre>${formattedData}</pre></td>
        `;
        tbody.appendChild(tr);
    });
}

fetchSubmissions();