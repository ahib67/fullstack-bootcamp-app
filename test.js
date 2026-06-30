fetch('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: 'cyber_student',
        email: 'test_user@domain.com',
        password: 'SuperSecurePassword123'
    })
})
.then(res => res.json())
.then(data => console.log('🎯 Server Response:', data))
.catch(err => console.error('❌ Network Error:', err));