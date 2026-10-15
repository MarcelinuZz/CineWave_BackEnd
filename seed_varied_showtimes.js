const { connectToDatabase } = require('./config/dbConfig');
const fs = require('fs');
const path = require('path');

const movies = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const theaters = [
    { id: 1, times: ['10:00:00', '13:00:00', '15:30:00', '18:30:00', '21:00:00'] },
    { id: 2, times: ['10:30:00', '13:30:00', '16:00:00', '19:00:00', '21:30:00'] },
    { id: 3, times: ['11:00:00', '14:00:00', '16:30:00', '19:30:00', '22:00:00'] },
    { id: 4, times: ['11:30:00', '14:30:00', '17:00:00', '20:00:00', '22:30:00'] }
];

const dates = [
    '2024-12-04',
    '2024-12-05',
    '2024-12-06',
    '2024-12-07',
    '2024-12-08',
    '2024-12-09',
    '2024-12-10',
    '2024-12-11',
    '2024-12-12',
    '2024-12-13',
    '2024-12-14'
];

async function seedShowtimes() {
    console.log('Connecting to database...');
    const pool = await connectToDatabase();

    console.log('Fetching existing showtimes to avoid duplicates...');
    const existingRes = await pool.request().query(`
        SELECT movie_id, theater_id, CONVERT(VARCHAR(19), showtime, 120) as st 
        FROM showtimes
    `);

    const existingSet = new Set(
        existingRes.recordset.map(row => `${row.movie_id}_${row.theater_id}_${row.st}`)
    );
    console.log(`Found ${existingSet.size} existing showtimes.`);

    const newShowtimes = [];

    for (const movieId of movies) {
        for (const date of dates) {
            for (const theater of theaters) {
                for (const time of theater.times) {
                    const stStr = `${date} ${time}`;
                    const key = `${movieId}_${theater.id}_${stStr}`;
                    if (!existingSet.has(key)) {
                        newShowtimes.push({
                            movie_id: movieId,
                            theater_id: theater.id,
                            showtime: `${stStr}.000`,
                            available_seats: 60
                        });
                    }
                }
            }
        }
    }

    console.log(`Prepared ${newShowtimes.length} new showtimes to insert.`);

    // Batch insert in chunks of 100
    const chunkSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < newShowtimes.length; i += chunkSize) {
        const chunk = newShowtimes.slice(i, i + chunkSize);
        const valuesSql = chunk.map(s => 
            `(${s.movie_id}, ${s.theater_id}, N'${s.showtime}', ${s.available_seats})`
        ).join(',\n');

        const insertQuery = `
            INSERT INTO showtimes (movie_id, theater_id, showtime, available_seats)
            VALUES 
            ${valuesSql};
        `;

        await pool.request().query(insertQuery);
        insertedCount += chunk.length;
        if (insertedCount % 500 === 0 || insertedCount === newShowtimes.length) {
            console.log(`Inserted ${insertedCount} / ${newShowtimes.length} showtimes...`);
        }
    }

    console.log(`All ${insertedCount} showtimes inserted successfully!`);

    // Write SQL script to file
    const sqlFilePath = path.join(__dirname, 'databaseQuery', 'insert_varied_showtimes.sql');
    let sqlContent = `-- Insert varied showtimes for CineWave movies 1 to 12 across 4 theaters and multiple dates/times\n`;
    sqlContent += `INSERT INTO dbo.showtimes (movie_id, theater_id, showtime, available_seats)\nVALUES\n`;
    sqlContent += newShowtimes.map(s => 
        `  (${s.movie_id}, ${s.theater_id}, N'${s.showtime}', ${s.available_seats})`
    ).join(',\n') + ';\n';

    fs.writeFileSync(sqlFilePath, sqlContent, 'utf-8');
    console.log(`Generated SQL script at: ${sqlFilePath}`);

    // Verify stats
    const statsRes = await pool.request().query(`
        SELECT 
            m.movie_id,
            m.movie_name,
            COUNT(s.showtime_id) as total_showtimes,
            COUNT(DISTINCT CAST(s.showtime AS DATE)) as total_dates
        FROM movies m
        LEFT JOIN showtimes s ON m.movie_id = s.movie_id
        WHERE m.status = 'Tayang'
        GROUP BY m.movie_id, m.movie_name
        ORDER BY m.movie_id
    `);

    console.log('\nUpdated Movie Showtime Summary:');
    console.table(statsRes.recordset);

    process.exit(0);
}

seedShowtimes().catch(err => {
    console.error('Error seeding showtimes:', err);
    process.exit(1);
});
