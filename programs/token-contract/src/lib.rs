use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token::{Token, MintTo, Transfer, Approve, TokenAccount};
use solana_program::system_program;


declare_id!("8pGRoeiTAJAp9uuLFXRSkQb3yVAXyuHFEZn2LsREUq5W");


fn verify_matching_accounts(
    left: &Pubkey,
    right: &Pubkey,
    error_msg: Option<String>,
) -> anchor_lang::Result<()> {
    if *left != *right {
        if error_msg.is_some() {
            msg!(error_msg.unwrap().as_str());
            msg!("Expected: {}", left.to_string());
            msg!("Received: {}", right.to_string());
        }
        return Err(ErrorCode::InvalidAccount.into());
    }
    Ok(())
}


#[program]
pub mod token_contract {
    use super::*;

    pub fn mint_token(ctx: Context<MintToken>,) -> Result<()> {
        // Create the MintTo struct for our context
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        // Create the CpiContext we need for the request
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // Execute anchor's helper function to mint tokens
        token::mint_to(cpi_ctx, 10)?;
        
        Ok(())
    }



    pub fn delegate_approve(ctx: Context<DelegateApprove>) -> Result<()> {
        
        /*let inp_amount : u64 = 10000000;
        let cpi_accounts = Approve {
            to: ctx.accounts.token_account.to_account_info(),
            delegate: ctx.accounts.delegate_root.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::approve(cpi_ctx, inp_amount)?;*/
        //ctx.accounts.token_account.delegate = ctx.accounts.delegate_root;


        Ok(())
    }

    pub fn transfer_token(ctx: Context<TransferToken>) -> Result<()> {
        // Create the Transfer struct for our context
        let transfer_instruction = Transfer{
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.from_authority.to_account_info(),
        };
         
        let cpi_program = ctx.accounts.token_program.to_account_info();
        // Create the Context for our Transfer request
        let cpi_ctx = CpiContext::new(cpi_program, transfer_instruction);

        // Execute anchor's helper function to transfer tokens
        anchor_spl::token::transfer(cpi_ctx, 5)?;
 
        Ok(())
    }


}


#[derive(Accounts)]
pub struct DelegateApprove<'info> {
    /*#[account(init, seeds = [token_account.key().as_ref(), delegate.key().as_ref()], bump, payer = allowance_payer, space = 112)]
    pub allowance: Account<'info, DelegateAllowance>,
    #[account(mut)]
    pub allowance_payer: Signer<'info>,*/
    pub owner: Signer<'info>,
    /// CHECK: hey doing this to get around!
    //pub delegate: UncheckedAccount<'info>,
    //#[account(seeds = [program_id.as_ref()], bump)]
    /// CHECK: hey doing this to get around!
    pub delegate_root: UncheckedAccount<'info>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    //#[account(address = token::ID)]
    /// CHECK: hey doing this to get around!
    //pub token_program: UncheckedAccount<'info>,
    #[account(address = system_program::ID)]
    /// CHECK: hey doing this to get around!
    pub system_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct TransferToken<'info> {
    pub token_program: Program<'info, Token>,
    /// CHECK: The associated token account that we are transferring the token from
    #[account(mut)]
    pub from: UncheckedAccount<'info>,
    /// CHECK: The associated token account that we are transferring the token to
    #[account(mut)]
    pub to: AccountInfo<'info>,
    // the authority of the from account 
    pub from_authority: Signer<'info>,
}


#[derive(Accounts)]
pub struct MintToken<'info> {
    /// CHECK: This is the token that we want to mint
    #[account(mut)]
    pub mint: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    /// CHECK: This is the token account that we want to mint tokens to
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,
    /// CHECK: the authority of the mint account
    #[account(mut)]
    pub authority: AccountInfo<'info>,
}


#[account]
#[derive(Default)]
pub struct DelegateAllowance {
    //pub owner: Pubkey, // The owner of the allowance (must be same as the owner of the token account)
    //pub token_account: Pubkey, // The token account for the allowance
    pub delegate: Pubkey, // The delegate granted an allowance of tokens to transfer (typically the root PDA of another program)
    //pub amount: u64, // The amount of tokens for the allowance (same decimals as underlying token)
}
// LEN: 8 + 32 + 32 + 32 + 8 = 112


#[error_code]
pub enum ErrorCode {
    #[msg("Invalid account")]
    InvalidAccount,
    #[msg("Allowance exceeded")]
    AllowanceExceeded,
}
