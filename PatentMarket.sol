pragma solidity ^0.5.5;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v2.5.0/contracts/token/ERC721/ERC721Full.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v2.5.0/contracts/ownership/Ownable.sol";
import "./PatentAuction.sol";

contract PatentMarket is ERC721Full, Ownable {

    constructor() ERC721Full("PatentMarket", "PTNT") public {}

    using Counters for Counters.Counter;

    Counters.Counter token_ids;

    address payable foundation_address = msg.sender;

    mapping(uint =>PatentAuction) public auctions;

    modifier PatentRegistered(uint token_id) {
        require(_exists(token_id), "Patent not registered!");
        _;
    }

    function registerPatent(string memory uri) public payable onlyOwner {
        token_ids.increment();
        uint token_id = token_ids.current();
        _mint(foundation_address, token_id);
        _setTokenURI(token_id, uri);
        createAuction(token_id);
    }

    function createAuction(uint token_id) public onlyOwner {
        auctions[token_id] = new PatentAuction(foundation_address);
    }

    function endAuction(uint token_id) public onlyOwner PatentRegistered(token_id) {
        PatentAuction auction = auctions[token_id];
        auction.auctionEnd();
        safeTransferFrom(owner(), auction.highestBidder(), token_id);
    }

    function auctionEnded(uint token_id) public view returns(bool) {
        PatentAuction auction = auctions[token_id];
        return auction.ended();
    }

    function highestBid(uint token_id) public view PatentRegistered(token_id) returns(uint) {
        PatentAuction auction = auctions[token_id];
        return auction.highestBid();
    }

    function pendingReturn(uint token_id, address sender) public view PatentRegistered(token_id) returns(uint) {
        PatentAuction auction = auctions[token_id];
        return auction.pendingReturn(sender);
    }

    function bid(uint token_id) public payable PatentRegistered(token_id) {
        PatentAuction auction = auctions[token_id];
        auction.bid.value(msg.value)(msg.sender);
    }

}
