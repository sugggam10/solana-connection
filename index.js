import {
  SystemProgram,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'

function deserializeCounterAccount(data) {
  if (data?.byteLength !== 8) {
    throw Error('Need exactly 8 bytes to deserialize counter')
  }

  return {
    count: Number(data[0])
  }
}

const { address, currentChain } = useAppKitAccount()
const { walletProvider, connection } = useAppKitProvider()

async function onIncrementCounter() {
  const PROGRAM_ID = new PublicKey('Cb5aXEgXptKqHHWLifvXu5BeAuVLjojQ5ypq6CfQj1hy')

  const counterKeypair = Keypair.generate()
  const counter = counterKeypair.publicKey

  const balance = await connection.getBalance(walletProvider.publicKey)
  if (balance < LAMPORTS_PER_SOL / 100) {
    throw Error('Not enough SOL in wallet')
  }

  const COUNTER_ACCOUNT_SIZE = 8
  const allocIx = SystemProgram.createAccount({
    fromPubkey: walletProvider.publicKey,
    newAccountPubkey: counter,
    lamports: await connection.getMinimumBalanceForRentExemption(COUNTER_ACCOUNT_SIZE),
    space: COUNTER_ACCOUNT_SIZE,
    programId: PROGRAM_ID
  })

  const incrementIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      {
        pubkey: counter,
        isSigner: false,
        isWritable: true
      }
    ],
    data: Buffer.from([0x0])
  })

  const tx = new Transaction().add(allocIx).add(incrementIx)

  tx.feePayer = walletProvider.publicKey
  tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash

  await walletProvider.signAndSendTransaction(tx, [counterKeypair])

  const counterAccountInfo = await connection.getAccountInfo(counter, {
    commitment: 'confirmed'
  })

  if (!counterAccountInfo) {
    throw new Error('Expected counter account to have been created')
  }

  const counterAccount = deserializeCounterAccount(counterAccountInfo?.data)

  if (counterAccount.count !== 1) {
    throw new Error('Expected count to have been 1')
  }

  console.log(`[alloc+increment] count is: ${counterAccount.count}`);
}
