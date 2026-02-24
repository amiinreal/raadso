import { query } from '../src/db.js';
import bcrypt from 'bcryptjs';

async function main() {
    try {
        console.log('Starting admin fix script...');

        // 1. Promote amiinstudio@gmail.com to admin
        console.log('Promoting amiinstudio@gmail.com to admin...');
        const res1 = await query(
            "UPDATE users SET role = 'admin' WHERE email = $1 RETURNING *",
            ['amiinstudio@gmail.com']
        );
        if (res1.rows.length > 0) {
            console.log('Success: amiinstudio@gmail.com is now admin.');
        } else {
            console.log('Warning: amiinstudio@gmail.com not found.');
        }

        // 2. Reset password for fakeamiin@gmail.com
        console.log('Resetting password for fakeamiin@gmail.com...');
        const hashedPassword = await bcrypt.hash('password123', 10);
        const res2 = await query(
            "UPDATE users SET password = $1 WHERE email = $2 RETURNING *",
            [hashedPassword, 'fakeamiin@gmail.com']
        );

        if (res2.rows.length > 0) {
            const user = res2.rows[0];
            console.log(`Password reset for ${user.email}. Role is: ${user.role}`);

            if (user.role !== 'admin') {
                console.log('Promoting fakeamiin@gmail.com to admin as well...');
                await query("UPDATE users SET role = 'admin' WHERE email = $1", ['fakeamiin@gmail.com']);
                console.log('fakeamiin@gmail.com is now admin.');
            }
        } else {
            console.log('Warning: fakeamiin@gmail.com not found.');
            // Attempt to create if not found? No, user implied it exists.
        }

        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
