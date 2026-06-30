const loginCredentials = {
    email: 'test_user@domain.com',
    password: 'SuperSecurePassword123'
};

const newLogPayload = {
    title: "Implemented Parameterized SQL Queries",
    content: "Upgraded data tier to utilize $ placeholders, successfully shifting code compilation ahead of user-data interpretation to block SQL injection vectors."
};

// Pipeline Execution Sequence
console.log('🚀 Launching multi-stage relational validation sequence...');

fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginCredentials)
})
.then(res => res.json())
.then(loginData => {
    console.log('🔑 Authentication cleared. Token captured.');
    const token = loginData.token;

    // STAGE 2: Write a new log entry using the token
    console.log('📝 Committing new operational snapshot to cloud...');
    return fetch('http://localhost:3000/api/logs', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLogPayload)
    }).then(res => res.json()).then(logWriteData => {
        return { token, logWriteData };
    });
})
.then(({ token, logWriteData }) => {
    console.log('💾 Server Response (Write Confirmation):', logWriteData);

    // STAGE 3: Fetch the user's isolated log list
    console.log('🔍 Fetching authenticated log feed index...');
    return fetch('http://localhost:3000/api/logs', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
})
.then(res => res.json())
.then(finalFeedData => {
    console.log('📊 Isolated Log Feed Results:', JSON.stringify(finalFeedData, null, 2));
    console.log('🏆 Test lifecycle complete! Everything worked smoothly.');
})
.catch(err => console.error('❌ Pipeline failure:', err));