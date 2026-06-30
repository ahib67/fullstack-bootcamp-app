fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'test_user@domain.com',
        password: 'SuperSecurePassword123' // The correct password
    })
})
.then(res => res.json())
.then(data => console.log('🔑 Login Response:', data))
.catch(err => console.error('❌ Error:', err));