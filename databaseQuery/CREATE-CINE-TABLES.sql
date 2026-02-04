CREATE TABLE users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    address VARCHAR(255),
    created_at DATETIME DEFAULT GETDATE() -- Use DATETIME with a default value
);

CREATE TABLE theaters (
    theater_id INT IDENTITY(1,1) PRIMARY KEY,
    theater_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    total_seats INT NOT NULL
);

CREATE TABLE movies (
    movie_id INT IDENTITY(1,1) PRIMARY KEY,
    movie_name VARCHAR(255) NOT NULL,
    age_rating VARCHAR(50),
    duration INT,
    dimension VARCHAR(10),
    language VARCHAR(50),
    release_date DATE,
    poster_link VARCHAR(255),
    status VARCHAR(20) CHECK (status IN ('Archived', 'Tayang', 'Upcoming')),
    genre VARCHAR(255),
    producer VARCHAR(255),
    director VARCHAR(255),
    trailer_link VARCHAR(255),
    synopsis VARCHAR(MAX)
);


CREATE TABLE showtimes (
    showtime_id INT IDENTITY(1,1) PRIMARY KEY,
    movie_id INT NOT NULL,
    theater_id INT NOT NULL,
    showtime DATETIME NOT NULL,
    available_seats INT NOT NULL,
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id),
    FOREIGN KEY (theater_id) REFERENCES theaters(theater_id)
);

CREATE TABLE seat_reservations (
    showtime_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    user_id INT NOT NULL,
    reservation_status VARCHAR(20) CHECK (reservation_status IN ('Reserved', 'Available')),
    PRIMARY KEY (showtime_id, seat_number),
    FOREIGN KEY (showtime_id) REFERENCES showtimes(showtime_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE tickets (
    ticket_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    showtime_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    ticket_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Booked', 'Cancelled', 'Completed')),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (showtime_id, seat_number) REFERENCES seat_reservations(showtime_id, seat_number)
);

CREATE TABLE refresh_tokens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(MAX) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    expires_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(user_id) 
);

CREATE TABLE GroupTicket (
    ticket_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    showtime_id INT NOT NULL,
    seat_number VARCHAR (180) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Booked', 'Cancelled', 'Completed')),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
);

CREATE TABLE payments (
    payment_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id VARCHAR(255) UNIQUE,
    ticket_id INT NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(20),
    amount DECIMAL(10, 2) NOT NULL,
    va_number NVARCHAR(255),
    payment_date DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ticket_id) REFERENCES GroupTicket(ticket_id)
);