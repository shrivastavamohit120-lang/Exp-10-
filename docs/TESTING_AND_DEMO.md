# Testing and demo guide

## Manual test cases
| # | Area | Steps | Expected |
|---|---|---|---|
| 1 | Sign up | Register with valid details | Logged in, redirected to Browse |
| 2 | Sign up | Short password or bad email | Clear error message |
| 3 | Login | Wrong password | "Incorrect email or password" |
| 4 | Protected pages | Open /dashboard while logged out | Redirected to login |
| 5 | Create listing | Post a lost item with and without photo | Listing page opens |
| 6 | Validation | Submit empty title | Blocked |
| 7 | Search | Search a word from a title; filter by type, category, status | Matching results only |
| 8 | Ownership | User B opens User A's listing | No edit or delete buttons; API returns 403 |
| 9 | Claim | User B claims a found item | Request pending on both dashboards |
| 10 | Accept | Owner accepts | Listing "claimed"; other pending requests rejected; contact email visible to both |
| 11 | Resolve | Owner marks resolved | Listing "resolved" |
| 12 | Borrow | Request a borrow item with a return date | Past dates blocked; accept then mark returned |
| 13 | Report | User reports a listing | Appears in Admin page |
| 14 | Admin | Admin removes or dismisses | Listing deleted or report cleared |
| 15 | Mobile | Open at 375 px width | No sideways scroll, all actions usable |
| 16 | Session | Delete token in dev tools, click Dashboard | Redirected to login |

## Suggested 7-minute demo
1. Problem (30 s): scattered WhatsApp groups and notice boards.
2. Browse and search as a guest.
3. Sign up as a student, post a lost item with a photo.
4. Second browser (private window): another student claims a found item.
5. Owner accepts on dashboard; show status change and shared contact.
6. Borrow flow with return date.
7. Report a listing, then admin removes it.
8. Show the code: models, `protect` middleware, request status logic; mention `npm test` and `npm run smoke`.

## Viva questions to prepare
- How are passwords stored? (bcrypt hash, never plain text)
- How does JWT authentication work here? (signed token with user id, 7-day expiry, verified in `protect`)
- How do you stop a user editing someone else's listing? (owner check in the route, returns 403)
- What happens on accept? (request accepted, listing status updated, other pending requests rejected)
- What prevents NoSQL injection and abuse? (input type checks, field whitelisting, regex escaping, rate limiting, Helmet)
