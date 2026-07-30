#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token::Client as TokenClient, Address, Env,
};
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, IntoVal, Symbol};
use crate::errors::ContractError;

#[contract]
pub struct EscrowVestingContract;

#[contractimpl]
impl EscrowVestingContract {
    /// Claims available vested tokens for the recipient and transfers real tokens.
    ///
    /// # Parameters
    /// * `env` - The execution environment.
    /// * `recipient` - The account receiving the vested tokens (must authenticate).
    /// * `token` - The SEP-41 token contract address.
    ///
    /// # Returns
    /// * `Result<i128, ContractError>` - The actual amount of tokens transferred.
    pub fn claim(env: Env, recipient: Address, token: Address) -> Result<i128, ContractError> {
        // 1. Authenticate recipient
        recipient.require_auth();

        // 2. Calculate vested and already-claimed amounts from storage
        let total_vested: i128 = env.storage().instance().get(&Symbol::new(&env, "total_vested")).unwrap_or(0);
        let already_claimed: i128 = env.storage().instance().get(&Symbol::new(&env, "claimed_amount")).unwrap_or(0);

        let claimable_amount = total_vested.checked_sub(already_claimed).unwrap_or(0);

        // 3. Validate claimable amount - revert with InsufficientVested if 0 or negative
        if claimable_amount <= 0 {
            return Err(ContractError::InsufficientVested);
        }

        // 4. Update contract storage accounting
        let new_claimed_total = already_claimed.checked_add(claimable_amount).unwrap();
        env.storage().instance().set(&Symbol::new(&env, "claimed_amount"), &new_claimed_total);

        // 5. Transfer tokens via Soroban SEP-41 token client
        let token_client = soroban_sdk::token::Client::new(&env, &token);
        let contract_address = env.current_contract_address();

        token_client.transfer(&contract_address, &recipient, &claimable_amount);

        // 6. Emit Claimed event
        env.events().publish(
            (symbol_short!("Claimed"), recipient.clone()),
            claimable_amount,
        );

        // 7. Return actual transferred amount
        Ok(claimable_amount)
    }
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Stream {
    pub sender: Address,
    pub recipient: Address,
    pub token: Address,
    pub total_amount: i128,
    pub claimed_amount: i128,
    pub start_time: u64,
    pub end_time: u64,
    pub canceled: bool,
}

#[contracttype]
enum DataKey {
    NextStreamId,
    Stream(u64),
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StreamCreated {
    pub stream_id: u64,
    pub sender: Address,
    pub recipient: Address,
    pub token: Address,
    pub total_amount: i128,
    pub start_time: u64,
    pub end_time: u64,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StreamClaimed {
    pub stream_id: u64,
    pub recipient: Address,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StreamCanceled {
    pub stream_id: u64,
    pub sender: Address,
}

#[contract]
pub struct StellarStreamContract;

#[contractimpl]
impl StellarStreamContract {
    pub fn create_stream(
        env: Env,
        sender: Address,
        recipient: Address,
        token: Address,
        total_amount: i128,
        start_time: u64,
        end_time: u64,
    ) -> u64 {
        sender.require_auth();

        if total_amount <= 0 {
            panic!("total_amount must be positive");
        }
        if end_time <= start_time {
            panic!("end_time must be greater than start_time");
        }

        // checks sebder balance.
        let token_client = TokenClient::new(&env, &token);
        let sender_balance = token_client.balance(&sender);
        if sender_balance < total_amount {
            panic!("insufficient sender balance");
        }

        // escrow = transfer total_amount from sender into this contract
        let contract_address = env.current_contract_address();
        token_client.transfer(&sender, &contract_address, &total_amount);

        let mut next_id: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::NextStreamId)
            .unwrap_or(0);
        next_id += 1;

        let stream = Stream {
            sender: sender.clone(),
            recipient: recipient.clone(),
            token: token.clone(),
            total_amount,
            claimed_amount: 0,
            start_time,
            end_time,
            canceled: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::NextStreamId, &next_id);
        env.storage()
            .persistent()
            .set(&DataKey::Stream(next_id), &stream);

        env.events().publish(
            (symbol_short!("Stream"), symbol_short!("Created")),
            StreamCreated {
                stream_id: next_id,
                sender,
                recipient,
                token,
                total_amount,
                start_time,
                end_time,
            },
        );

        next_id
    }

    pub fn get_stream(env: Env, stream_id: u64) -> Stream {
        read_stream(&env, stream_id)
    }

    pub fn get_next_stream_id(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::NextStreamId)
            .unwrap_or(0)
    }

    pub fn claimable(env: Env, stream_id: u64, at_time: u64) -> i128 {
        let stream = read_stream(&env, stream_id);
        let vested = vested_amount(&stream, at_time);
        let claimable = vested - stream.claimed_amount;
        if claimable < 0 {
            0
        } else {
            claimable
        }
    }

    pub fn claim(env: Env, stream_id: u64, recipient: Address, amount: i128) -> i128 {
        if amount <= 0 {
            panic!("amount must be positive");
        }

        let mut stream = read_stream(&env, stream_id);
        if stream.recipient != recipient {
            panic!("recipient mismatch");
        }
        recipient.require_auth();

        let now = env.ledger().timestamp();
        let claimable_now = Self::claimable(env.clone(), stream_id, now);

        // amount claimed cannot exceed vested amount
        if amount > claimable_now {
            panic!("amount exceeds claimable");
        }

        // transfer tokens from contract escrow to recipient
        let token_client = TokenClient::new(&env, &stream.token);
        let contract_address = env.current_contract_address();
        token_client.transfer(&contract_address, &recipient, &amount);

        // Update accounting after successful transfer
        stream.claimed_amount += amount;
        env.storage()
            .persistent()
            .set(&DataKey::Stream(stream_id), &stream);

        env.events().publish(
            (symbol_short!("Stream"), symbol_short!("Claimed")),
            StreamClaimed {
                stream_id,
                recipient,
                amount,
            },
        );

        amount
    }

    pub fn cancel(env: Env, stream_id: u64, sender: Address) {
        let mut stream = read_stream(&env, stream_id);
        if stream.sender != sender {
            panic!("sender mismatch");
        }
        sender.require_auth();

        if stream.canceled {
            return;
        }

        let now = env.ledger().timestamp();
        stream.canceled = true;

        // compute vested BEFORE truncating end_time
        let vested = vested_amount(&stream, now);
        let sender_refund = stream.total_amount - vested;

        // truncate end_time so recipient can't claim past cancel point
        let min_end = if now > stream.start_time {
            now
        } else {
            stream.start_time + 1
        };
        if min_end < stream.end_time {
            stream.end_time = min_end;
        }

        if sender_refund > 0 {
            let token_client = TokenClient::new(&env, &stream.token);
            let contract_address = env.current_contract_address();
            token_client.transfer(&contract_address, &sender, &sender_refund);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Stream(stream_id), &stream);

        env.events().publish(
            (symbol_short!("Stream"), symbol_short!("Canceled")),
            StreamCanceled { stream_id, sender },
        );
    }
}

fn read_stream(env: &Env, stream_id: u64) -> Stream {
    env.storage()
        .persistent()
        .get(&DataKey::Stream(stream_id))
        .unwrap_or_else(|| panic!("stream not found"))
}

fn vested_amount(stream: &Stream, at_time: u64) -> i128 {
    if at_time <= stream.start_time {
        return 0;
    }

    let effective_time = if at_time >= stream.end_time {
        stream.end_time
    } else {
        at_time
    };

    let elapsed = effective_time - stream.start_time;
    let total_duration = stream.end_time - stream.start_time;

    if total_duration == 0 {
        return stream.total_amount;
    }

    stream.total_amount * (elapsed as i128) / (total_duration as i128)
}

#[cfg(test)]
mod test;
