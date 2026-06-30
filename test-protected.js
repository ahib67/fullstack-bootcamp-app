// STEP 1: Log in to dynamically extract a fresh security token pass
fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'test_user@domain.com',
        password: 'SuperSecurePassword123'
    })
})
.then(res => res.json())
.then(loginData => {
    console.log('🔑 Token Successfully Acquired.');
    const mySecureToken = loginData.token;

    // STEP 2: Attempt to knock on the secure vault door, passing the token in the headers
    return fetch('http://localhost:3000/api/user/dashboard', {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mySecureToken}` // Injecting the passport badge
        }
    });
})
.then(res => res.json())
.then(protectedData => {
    console.log('🛡️ Protected Server Response:', protectedData);
})
.catch(err => console.error('❌ Pipeline Break:', err));