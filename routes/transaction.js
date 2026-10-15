const express = require('express');
const snap = require('../config/midtransConfig');
const authenticateJWT = require('../Middleware/authenticateJWT');
const dbConfig = require('../config/dbConfig');

const router = express.Router();

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

router.post('/create-transaction', authenticateJWT, async (req, res) => {
    const { ticket_id, gross_amount } = req.body;

    if (!ticket_id || !gross_amount || Number(gross_amount) <= 0) {
        return res.status(400).json({ message: 'Ticket ID and valid gross amount are required' });
    }

    const pool = await dbConfig.connectToDatabase();

    try {
        const existingPayment = await pool.request()
        .input('ticket_id', ticket_id)
        .query(`
          SELECT COUNT(*) AS count 
          FROM payments 
          WHERE ticket_id = @ticket_id 
            AND payment_status = 'settlement'
        `);

        if (existingPayment.recordset[0].count > 0) {
            return res.status(400).json({ message: 'This ticket has already been purchased by someone else.' });
        }

        const randomString = generateRandomString(15);
        const order_id = `${randomString}${ticket_id}`;

        console.log('Generated Order ID:', order_id);

        const parameter = {
            transaction_details: {
                order_id: order_id,
                gross_amount: Math.round(Number(gross_amount)),
            },
            customer_details: {
                email: req.user?.email || undefined,
                phone: req.user?.phone || undefined,
            },
        };

        const transaction = await snap.createTransaction(parameter);

        console.log('Midtrans Snap Response:', transaction);


        const existingPayments = await pool.request()
            .input('ticket_id', ticket_id)
            .query(`
                SELECT payment_id 
                FROM payments 
                WHERE ticket_id = @ticket_id
            `);

        if (existingPayments.recordset.length > 0) {
            const primaryPaymentId = existingPayments.recordset[0].payment_id;

            // Delete any redundant duplicate payments for this ticket if any exist
            if (existingPayments.recordset.length > 1) {
                await pool.request()
                    .input('ticket_id', ticket_id)
                    .input('primaryPaymentId', primaryPaymentId)
                    .query(`
                        DELETE FROM payments 
                        WHERE ticket_id = @ticket_id AND payment_id != @primaryPaymentId
                    `);
            }

            // Update the single payment record with the new order_id and pending status
            await pool.request()
                .input('order_id', order_id)
                .input('primaryPaymentId', primaryPaymentId)
                .input('amount', Math.round(Number(gross_amount)))
                .query(`
                    UPDATE payments
                    SET order_id = @order_id,
                        amount = @amount,
                        payment_method = 'midtrans',
                        payment_status = 'pending',
                        va_number = NULL,
                        payment_date = NULL
                    WHERE payment_id = @primaryPaymentId
                `);
        } else {
            await pool.request()
                .input('order_id', order_id)
                .input('ticket_id', ticket_id)
                .input('amount', Math.round(Number(gross_amount)))
                .query(`
                    INSERT INTO payments (order_id, ticket_id, payment_method, payment_status, amount, va_number, payment_date)
                    VALUES (@order_id, @ticket_id, 'midtrans', 'pending', @amount, NULL, NULL)
                `);
        }

        res.status(201).json({
            message: 'Transaction created successfully',
            order_id: order_id,
            token: transaction.token,
            redirect_url: transaction.redirect_url,
            transaction,
        });
    } catch (error) {
        console.error('Error creating transaction:', error.response?.data || error.message);
        res.status(500).json({ message: 'Error creating transaction', error: error.message });
    }
});

module.exports = router;