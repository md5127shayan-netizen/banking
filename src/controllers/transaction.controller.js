const transactionModel=require('../models/transaction.model');
const ledgerModel=require('../models/ledger.model');
const accountModel=require('../models/account.model');
const emailService=require('../services/email.service');
const mongoose=require('mongoose');


// create a new transaction
// 1.validate request
// 2.validate idempotencyKey
// 3.check account status
// 4.derive sender balance from ledger
// 5.create transaction (pending)
// 6create debit ledger entry 
// 7.create credit ledger entry
// 8.mark transaction as completed
// 9.commit mongo session
// 10.send email notification to both parties


async function createTransaction(req,res){

    // validate request

    const {fromAccount,toAccount,amount,idempotencyKey}=req.body;
    const transactionAmount = Number(amount);

    if(!fromAccount || !toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            success:false,
            message:'All fields are required'
        });
    }

    if(Number.isNaN(transactionAmount) || transactionAmount <= 0){
        return res.status(400).json({
            success:false,
            message:'Amount must be greater than 0'
        });
    }

    const fromUserAccount=await accountModel.findOne({
        _id:fromAccount,
    }).populate('user');

    const toUserAccount=await accountModel.findOne({
        _id:toAccount,
    }).populate('user');

    if(!fromUserAccount || !toUserAccount){
        return res.status(404).json({
            success:false,
            message:'From or To account not found'
        });
    }


    const isTransactionAlreadyExists=await transactionModel.findOne({
        idempotencyKey:idempotencyKey
    });

    if(isTransactionAlreadyExists){
       if(isTransactionAlreadyExists.status==='COMPLETED'){
        return res.status(200).json({
            message:'Transaction already completed',
            transaction:isTransactionAlreadyExists
        });
       }

       if(isTransactionAlreadyExists.status==='PENDING'){
        return res.status(200).json({
            message:'Transaction is still pending',
            transaction:isTransactionAlreadyExists
        });
       }

       if(isTransactionAlreadyExists.status==='FAILED'){
        return res.status(400).json({
            success:false,
            message:'A transaction with the same idempotency key already exists and it has failed'
        });
       }

       if(isTransactionAlreadyExists.status==='REVERSED'){
        return res.status(400).json({
            success:false,
            message:'A transaction with the same idempotency key already exists and it has been reversed'
        });
       }

       return res.status(400).json({
        success:false,
        message:'A transaction with the same idempotency key already exists'
       });
    }

     // check account status

     if(fromUserAccount.status!=='ACTIVE' || toUserAccount.status!=='ACTIVE'){
        return res.status(400).json({
            success:false,
            message:'From or To account is not active'
        });
     }

     // derive sender balance from ledger

     const balance = await fromUserAccount.getBalance();  

        if(balance<transactionAmount){
            return res.status(400).json({
                success:false,
                message:'Insufficient balance'
            });
         }

     // create transaction (pending)



     const session=await mongoose.startSession();

     try {
         session.startTransaction();

         const [transaction]=await transactionModel.create({
            fromAccount,
            toAccount,
            amount: transactionAmount,
            idempotencyKey,
            status:'PENDING'
         }, { session });

         await ledgerModel.create([
            {
                account:fromAccount,
                type:'DEBIT',
                amount:transactionAmount,
                transaction:transaction._id,
            },
            {       
                account:toAccount,
                type:'CREDIT',
                amount:transactionAmount,
                transaction:transaction._id
            }
         ], { session });
          
         transaction.status='COMPLETED';
         await transaction.save({session});

         await session.commitTransaction();

         if (fromUserAccount.user?.email) {
            await emailService.sendTransactionEmail(fromUserAccount.user.email, fromUserAccount.user.name, transactionAmount);
         }

         if (toUserAccount.user?.email) {
            await emailService.sendTransactionEmail(toUserAccount.user.email, toUserAccount.user.name, transactionAmount);
         }

         return res.status(201).json({
            success:true,
            message:'Transaction completed successfully',
            transaction
         });
     } catch (error) {
         await session.abortTransaction();

         return res.status(500).json({
            success:false,
            message:error.message
         });
     } finally {
         await session.endSession();
     }
}

async function createInitialFundsTransaction(req, res) {
    const {toAccount, amount, idempotencyKey}=req.body;
    const transactionAmount = Number(amount);

    if(!toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            success:false,
            message:'toAccount, amount and idempotencyKey are required'
        });
    }

    if(Number.isNaN(transactionAmount) || transactionAmount <= 0){
        return res.status(400).json({
            success:false,
            message:'Amount must be greater than 0'
        });
    }

    const userAccount=await accountModel.findById(toAccount).populate('user');

    if(!userAccount){
        return res.status(404).json({
            success:false,
            message:'Account not found'
        });
    }

    if(userAccount.status!=='ACTIVE'){
        return res.status(400).json({
            success:false,
            message:'Account is not active'
        });
    }

    const isTransactionAlreadyExists=await transactionModel.findOne({ idempotencyKey });

    if(isTransactionAlreadyExists){
        return res.status(200).json({
            message:'Transaction already exists',
            transaction:isTransactionAlreadyExists
        });
    }

    const session=await mongoose.startSession();

    try {
        session.startTransaction();

      const transaction = await transactionModel.create({
  fromAccount,
  toAccount,
  amount: transactionAmount,
  idempotencyKey,
  status: 'COMPLETED'
}, { session });

    await ledgerModel.create([{
  account: toAccount,
  type: 'CREDIT',
  amount: transactionAmount,
  transaction: transaction._id
}], { session });

        await session.commitTransaction();

        if (userAccount.user?.email) {
            await emailService.sendTransactionEmail(userAccount.user.email, userAccount.user.name, transactionAmount);
        }

        return res.status(201).json({
            success:true,
            message:'Initial funds added successfully',
            transaction
        });
    } catch (error) {
        await session.abortTransaction();

        return res.status(500).json({
            success:false,
            message:error.message
        });
    } finally {
        await session.endSession();
    }
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction
};
