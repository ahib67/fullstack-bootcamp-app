const contactForm = document.getElementById('contact');

contactForm.addEventListener('submit', function(event) {
    event.preventDefault();

    const userName = document.getElementById('username').value;
    const userEmail = document.getElementById('email').value;

    const formData = {
        name: userName,
        email: userEmail
    };

    // Ship data payload to the backend server port
    fetch('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Receipt received from backend:", data);
        
        // This is the line we need to see!
        const confirmationZone = document.getElementById('confirmation-zone');
        confirmationZone.innerHTML = `
            <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 4px; margin-top: 15px; border: 1px solid #c3e6cb;">
                <strong>Success!</strong> Server Response: <b>${data.message}</b>
            </div>
        `;
    })
    .catch(error => {
        console.error("Shipping failed:", error);
    });

    contactForm.reset();
});