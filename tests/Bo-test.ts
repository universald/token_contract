import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";

import { TokenContract } from "../target/types/token_contract";

import {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  getOrCreateAssociatedTokenAccount,
  createMint,
  getMint,
  getAccount,
  mintTo,
  tokenAccounts,
  transfer,
  approveChecked,
  transferChecked,
  
} from "@solana/spl-token"; 

import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';


/**
 * Pass in environment variables from `.env` file.
 **/

import * as dotenv from 'dotenv';
import { assert } from "chai";
//import { program } from "@project-serum/anchor/dist/cjs/spl/associated-token";
dotenv.config()

// Q: is the deployer the same as alice?
// Q: do anchor.toml and declare_id macro point to same thing?

describe("perlin-sh", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const connection = anchor.AnchorProvider.env().connection;

  const program = anchor.workspace.TokenContract as Program<TokenContract>;
  
  /* for longer term testing, we need to set up the following wallets:

    token_creator - the owner of the SPL token, also vested with mint and freeze authorities

    subscriber - wallet, ATA, 
    agent
    merchant

    we will also have SOL airdropped for every wallet

  */

  const tokenCreatorWallet = Keypair.generate();
  const subscriberWallet = Keypair.generate();
  const agentWallet = Keypair.generate();
  const merchantWallet = Keypair.generate();


  console.log("tokenCreatorWallet wallet balance after airdrop (SOL)", tokenCreatorWallet.publicKey, tokenCreatorWallet.secretKey);
  console.log("subscriberWallet wallet balance after airdrop (SOL)", subscriberWallet.publicKey, subscriberWallet.secretKey);
  console.log("agentWallet wallet balance after airdrop (SOL)", agentWallet.publicKey, agentWallet.secretKey);
  console.log("merchantWallet wallet balance after airdrop (SOL)", merchantWallet.publicKey, merchantWallet.secretKey);

  /* token mint and freeze authorities are both with tokenCreator*/

  //const mintAuthority = Keypair.generate();
  //const freezeAuthority = Keypair.generate();
  


  it("Is initialized!", async () => {

    //airdrop SOL to all the wallets
    const airdropSignature = await connection.requestAirdrop(
      tokenCreatorWallet.publicKey,
      LAMPORTS_PER_SOL,
    );

    await connection.confirmTransaction(airdropSignature);


    const airdropSignature2 = await connection.requestAirdrop(
      subscriberWallet.publicKey,
      LAMPORTS_PER_SOL,
    );

    await connection.confirmTransaction(airdropSignature2);


    const airdropSignature3 = await connection.requestAirdrop(
      agentWallet.publicKey,
      LAMPORTS_PER_SOL,
    );

    await connection.confirmTransaction(airdropSignature3);

    const airdropSignature4 = await connection.requestAirdrop(
      merchantWallet.publicKey,
      LAMPORTS_PER_SOL,
    );

    await connection.confirmTransaction(airdropSignature3);

    //Display all the wallet balances in SOL after airdrop

    let balance;
    
    balance = await connection.getBalance(tokenCreatorWallet.publicKey);
    console.log(" tokenCreatorWallet wallet balance after airdrop (SOL)", `${balance / LAMPORTS_PER_SOL} SOL`);

    balance = await connection.getBalance(subscriberWallet.publicKey);
    console.log(" subscriberWallet wallet balance after airdrop (SOL)", `${balance / LAMPORTS_PER_SOL} SOL`);

    balance = await connection.getBalance(agentWallet.publicKey);
    console.log(" agentWallet wallet balance after airdrop (SOL)", `${balance / LAMPORTS_PER_SOL} SOL`);

    balance = await connection.getBalance(merchantWallet.publicKey);
    console.log(" merchantWallet wallet balance after airdrop (SOL)", `${balance / LAMPORTS_PER_SOL} SOL`);

    //creating the token program
    const mint = await createMint(
      connection,
      tokenCreatorWallet,
      tokenCreatorWallet.publicKey,
      tokenCreatorWallet.publicKey,
      9 // We are using 9 to match the CLI decimal default exactly
    );

    //get a detailed look at the token program
    const mintInfo = await getMint(
      connection,
      mint
    )

    console.log("Token Program Info:", mintInfo);

    //creating the ATA associated with the tokenCreator
    const tokenCreatorWalletATA = await getOrCreateAssociatedTokenAccount(
      connection,
      tokenCreatorWallet,
      mint,
      tokenCreatorWallet.publicKey
    )

    //mint to the tokenCreator ATA
    await mintTo(
      connection,
      tokenCreatorWallet,
      mint,
      tokenCreatorWalletATA.address,
      tokenCreatorWallet,
      100000000000 // because decimals for the mint are set to 9 
    )

    console.log("Token Account Address/Payer ATA address:", tokenCreatorWalletATA.address.toBase58());
    // 7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi

    const tokenAccountInfo = await getAccount(
      connection,
      tokenCreatorWalletATA.address
    )

    console.log("tokenCreator ATA account balance after initial mint", tokenAccountInfo.amount);
    // 100


    let subscriberWalletATA =  await getOrCreateAssociatedTokenAccount(
      connection,
      subscriberWallet,
      mint,
      subscriberWallet.publicKey
    )
  
    let merchantWalletATA =  await getOrCreateAssociatedTokenAccount(
      connection,
      merchantWallet,
      mint,
      subscriberWallet.publicKey
    )
  
    const signature8 = await transfer(
      connection,
      subscriberWallet,
      tokenCreatorWalletATA.address,
      subscriberWalletATA.address,
      tokenCreatorWallet.publicKey,
      5000000,
      [tokenCreatorWallet, subscriberWallet]
    );

    console.log("transfer signature", signature8);
    
    const tokenAccountInfo1 = await getAccount(
      connection,
      tokenCreatorWalletATA.address
    )

    const tokenAccountInfo2 = await getAccount(
      connection,
      subscriberWalletATA.address
    )

    const tokenAccountInfo3 = await getAccount(
      connection,
      merchantWalletATA.address
    )

    // 100

  // we now try to implement the delegation and delegated transfer in JS and see it working

    console.log("Subscriber token account info", tokenAccountInfo2)
    console.log("tokenCreator, subscriber, and merchant ATA account balance after initial transfer", tokenAccountInfo1.amount, tokenAccountInfo2.amount, tokenAccountInfo3.amount);
   
    let txhash = await approveChecked(
      connection, // connection
      subscriberWallet, // fee payer
      mint, // mint
      tokenAccountInfo2.address, // token account
      agentWallet.publicKey, // delegate
      subscriberWallet, // owner of token account
      1e8, // amount, if your deciamls is 8, 10^8 for 1 token
      9 // decimals
    );
    await connection.confirmTransaction(txhash);

    console.log("txhash",txhash);
    console.log("Subscriber token account info after delegation function", tokenAccountInfo2);

    tokenAccountInfo2.delegate=agentWallet.publicKey;

    tokenAccountInfo2.delegatedAmount=BigInt(100000);
    
    //console.log("testing delegated transfer")
    
    console.log("Subscriber token account info after delegation variable assignment", tokenAccountInfo2)

    /*
    const signature9 = await transferChecked(
      connection,
      Keypair.fromSecretKey(agentWallet.secretKey),
      subscriberWalletATA.address,
      mint,
      merchantWalletATA.address,
      subscriberWallet.publicKey,
      5000,
      9
    );*/
    
    //console.log(signature9);

    console.log("tokenCreator, subscriber, and merchant ATA account balance after delegated transfer", tokenAccountInfo1.amount, tokenAccountInfo2.amount, tokenAccountInfo3.amount);
     
  // Counter for the tests.
    const allowance = anchor.web3.Keypair.generate();

    console.log('testing');

    await program.methods.delegateApprove().accounts({
        //allowance: allowance.publicKey,
        //allowancePayer: subscriberWallet.publicKey,
        owner: subscriberWallet,
        //delegate: agentWallet.publicKey,
        delegateRoot: agentWallet.publicKey,
        tokenAccount: subscriberWalletATA.address,
        tokenProgram: mint,
        systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    console.log('testing2');




 
  });
});
