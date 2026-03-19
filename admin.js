let allSubmissions = [];

async function fetchSubmissions() {
    try {
        const response = await fetch('https://backend-gsssgkullu-in-school-website.onrender.com/api/submissions');
        const data = await response.json();
        allSubmissions = data; 
        
        const tbody = document.getElementById('table-body');
        tbody.innerHTML = ''; 

        data.forEach(row => {
            const tr = document.createElement('tr');
            let parsedData = {};
            try {
                parsedData = JSON.parse(row.full_data);
            } catch (e) {
                console.error("Error parsing data for row", row._id);
            }

            tr.innerHTML = `
                <td>${row._id.slice(-6)}</td> 
                <td><strong>${row.student_name || 'N/A'}</strong></td>
                <td>${row.aadhar || 'N/A'}</td>
                <td>${new Date(row.timestamp).toLocaleString()}</td>
                <td>
                    <button style="background:#1a237e; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; margin-right:5px;" onclick='downloadPDF(${JSON.stringify(parsedData)}, "${row.student_name}")'>Download Form</button>
                    <button class="delete-btn" onclick="deleteSubmission('${row._id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error fetching submissions:", error);
    }
}

async function deleteSubmission(id) {
    if (confirm("Are you sure you want to delete this student's admission data? This action cannot be undone.")) {
        try {
            const response = await fetch(`https://backend-gsssgkullu-in-school-website.onrender.com/api/submissions/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                alert("Data deleted successfully.");
                fetchSubmissions(); // Refresh the table
            } else {
                alert("Failed to delete data.");
            }
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Error connecting to server.");
        }
    }
}

function downloadExcel() {
    if (allSubmissions.length === 0) {
        alert("No data to download.");
        return;
    }
    
    // Flatten the JSON string back into objects for Excel
    const excelData = allSubmissions.map(sub => {
        let details = {};
        try { details = JSON.parse(sub.full_data); } catch(e){}
        return {
            "ID": sub._id,
            "Date Submitted": new Date(sub.timestamp).toLocaleString(),
            ...details
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Admissions");
    
    XLSX.writeFile(workbook, "Admission_Submissions_2026.xlsx");
}

function downloadPDF(data, studentName) {
    const template = buildPDFTemplate(data);
    document.body.appendChild(template);

    const opt = {
        margin:       0.5,
        filename:     `${studentName || 'Student'}_Admission_Form.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(template).save().then(() => {
        template.remove(); 
    });
}

function buildPDFTemplate(data) {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.top = '-10000px';
    div.style.width = '800px'; 
    div.style.padding = '40px';
    div.style.fontFamily = 'Arial, sans-serif';
    div.style.color = '#000';
    div.style.backgroundColor = '#fff';

    div.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0; text-decoration: underline;">PM SHRI Govt. Sen. Sec. School (Girls) Kullu (HP)</h2>
            <h3 style="margin: 5px 0;">Admission Form +1/+2 (Session 2026-27)</h3>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
            <tr>
                <td style="border: 1px solid #000; padding: 8px;" colspan="2"><strong>1. Stream:</strong> ${data.stream || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px;" colspan="2"><strong>2. Subjects Proposed:</strong> 1. ${data.sub1 || 'English'}, 2. ${data.sub2 || ''}, 3. ${data.sub3 || ''}, 4. ${data.sub4 || ''}, 5. ${data.sub5 || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px;" colspan="2"><strong>3. Name:</strong> ${data.studentName || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px; width: 50%;"><strong>4. Date of Birth:</strong> ${data.dob || ''}</td>
                <td style="border: 1px solid #000; padding: 8px; width: 50%;"><strong>9. Age on 1st April 2026:</strong> ${data.age || ''} Years</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px;"><strong>5. Father's Name:</strong> Sh. ${data.fatherName || ''}</td>
                <td style="border: 1px solid #000; padding: 8px;"><strong>6. Mother's Name:</strong> Smt. ${data.motherName || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px;"><strong>7. Father's/Guardian Mob:</strong> ${data.mobile || ''}</td>
                <td style="border: 1px solid #000; padding: 8px;"><strong>8. Guardian Name:</strong> ${data.guardianName || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px;"><strong>10. Father's Occupation:</strong> ${data.occupation || ''}</td>
                <td style="border: 1px solid #000; padding: 8px;"><strong>Annual Income:</strong> Rs. ${data.income || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px;" colspan="2"><strong>11. Permanent Address:</strong> Village ${data.village || ''}, PO ${data.postOffice || ''}, Tehsil ${data.tehsil || ''}, Distt ${data.district || ''}, State ${data.state || ''}, Pin ${data.pincode || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px;"><strong>Category:</strong> ${data.category || ''}</td>
                <td style="border: 1px solid #000; padding: 8px;"><strong>Religion:</strong> ${data.religion || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px;" colspan="2"><strong>14. Aadhar Number:</strong> ${data.aadhar || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px;" colspan="2"><strong>Bank Details:</strong> ${data.bankName || ''} | <strong>A/C:</strong> ${data.bankAcc || ''} | <strong>IFSC:</strong> ${data.ifsc || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px;"><strong>15. Whether Student is CWSN:</strong> ${data.cwsn || ''}</td>
                <td style="border: 1px solid #000; padding: 8px;"><strong>Category of CWSN:</strong> ${data.cwsnCategory || 'N/A'}</td>
            </tr>
        </table>

        <h4 style="margin-bottom: 5px;">Previous Educational Details:</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
            <thead>
                <tr>
                    <th style="border: 1px solid #000; padding: 6px;">Class</th>
                    <th style="border: 1px solid #000; padding: 6px;">Session</th>
                    <th style="border: 1px solid #000; padding: 6px;">Board/School</th>
                    <th style="border: 1px solid #000; padding: 6px;">Roll No</th>
                    <th style="border: 1px solid #000; padding: 6px;">Result</th>
                    <th style="border: 1px solid #000; padding: 6px;">Marks</th>
                    <th style="border: 1px solid #000; padding: 6px;">%</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="border: 1px solid #000; padding: 6px;">Matric</td>
                    <td style="border: 1px solid #000; padding: 6px;">${data.matricSession || ''}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${data.matricBoard || ''}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${data.matricRoll || ''}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${data.matricResult || ''}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${data.matricMarks || ''}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${data.matricPercent || ''}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 6px;">+1</td>
                    <td style="border: 1px solid #000; padding: 6px;">${data.plusOneSession || ''}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${data.plusOneBoard || ''}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${data.plusOneRoll || ''}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${data.plusOneResult || ''}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${data.plusOneMarks || ''}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${data.plusOnePercent || ''}</td>
                </tr>
            </tbody>
        </table>

        <div style="margin-top: 50px; display: flex; justify-content: space-between;">
            <div style="text-align: center;">
                <p>_______________________</p>
                <p><strong>Signature of Student</strong></p>
            </div>
            <div style="text-align: center;">
                <p>_______________________</p>
                <p><strong>Signature of Father/Guardian</strong></p>
            </div>
        </div>
    `;
    return div;
}

fetchSubmissions();