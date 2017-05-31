/******************************************************************************
 * Copyright (c) Dworek 2016. All rights reserved.                            *
 *                                                                            *
 * @author Tim Visee                                                          *
 * @website http://timvisee.com/                                              *
 *                                                                            *
 * Open Source != No Copyright                                                *
 *                                                                            *
 * Permission is hereby granted, free of charge, to any person obtaining a    *
 * copy of this software and associated documentation files (the "Software"), *
 * to deal in the Software without restriction, including without limitation  *
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,   *
 * and/or sell copies of the Software, and to permit persons to whom the      *
 * Software is furnished to do so, subject to the following conditions:       *
 *                                                                            *
 * The above copyright notice and this permission notice shall be included    *
 * in all copies or substantial portions of the Software.                     *
 *                                                                            *
 * You should have received a copy of The MIT License (MIT) along with this   *
 * program. If not, see <http://opensource.org/licenses/MIT/>.                *
 ******************************************************************************/

// A list of male and female nicknames
var maleNames = ['007', 'Action Jackson', 'Ammo', 'Angel Eyes', 'Angel Wings', 'Angel', 'Baby Face', 'Bandana', 'Beans', 'Big Brains', 'Big Daddy', 'Black Eyed', 'Blackjack', 'Blind', 'Blondey', 'Blue Eyes', 'Buddy', 'Bugs', 'Bulletproof', 'Bullettooth', 'Buster', 'Buttercup', 'Buzzy', 'Cheater', 'Coins', 'Coughing', 'Crackers', 'Crazy Eyes', 'Crazy', 'Danger', 'Daydream', 'Deaf', 'Death', 'Diamond', 'Doberman', 'Eagle Eyes', 'Eyepatch', 'Fire', 'Five Fingers', 'Flowers', 'Four Fingers', 'Four Toes', 'Gold Digger', 'Goliath', 'Good Looking', 'Greed', 'Grinning', 'H4X0R', 'Horseface', 'Hot Shot', 'Iceman', 'Iron Man', 'Iron', 'Knuckles', 'Legs', 'Little Caesar', 'Lucky', 'Machette', 'Machine Gun', 'Mad Bomber', 'Mad Dog', 'Mad Eyed', 'Mad Hatter', 'Mad Man', 'Meatball', 'Merciless', 'Moneybags', 'Mumbler', 'Muscles', 'Nice Guy', 'Nighthawk', 'Nightmare', 'Nine Lives', 'No Cigar', 'No Name', 'Numbers', 'Oddfather', 'Old Guy', 'One Armed', 'One Eye', 'Peachless', 'Peanuts', 'Pegleg', 'Pink Panther', 'Pitbull', 'Poison', 'Pretty Boy', 'Professional', 'Razor', 'Repo Man', 'Revolvers', 'Rifleman', 'Roulette', 'Rusty', 'Scarface', 'Scars', 'Shades', 'Shotgun', 'Silence', 'Silver Dollar', 'Sly', 'Smiling', 'Smokes', 'Squint', 'Straight Jacket', 'Sweet Cakes', 'Tall Guy', 'Tarzan', 'The Admiral', 'The Animal', 'The Ant', 'The Banker', 'The Barber', 'The Bat', 'The Bear', 'The Beast', 'The Blast', 'The Boot', 'The Boss', 'The Brain', 'The Brute', 'The Bug', 'The Builder', 'The Bull', 'The Butcher', 'The Bystander', 'The Calm', 'The Cat', 'The Chin', 'The Clown', 'The Cook', 'The Dapper', 'The Dentist', 'The Dove', 'The Duck', 'The Duke', 'The Dwarf', 'The Eagle', 'The Ear', 'The Enforcer', 'The Fang', 'The Fat', 'The Fixer', 'The Fox', 'The Genius', 'The Gent', 'The Ghost', 'The Golfer', 'The Grim Reaper', 'The Grin', 'The Grocer', 'The Hatchet', 'The Hook', 'The Horse', 'The Hulk', 'The Hump', 'The Humpback', 'The Jackal', 'The Jester', 'The Kid', 'The Killer', 'The Lion', 'The Mad', 'The Mammoth', 'The Menace', 'The Midget', 'The Mouse', 'The Night', 'The Nose', 'The Owl', 'The Ox', 'The Panther', 'The Peacemaker', 'The Phantom', 'The Plumber', 'The Poet', 'The Quiet', 'The Rabbit', 'The Rat', 'The Reaper', 'The Referee', 'The Ring', 'The Rock', 'The Saint', 'The Scourge', 'The Serpent', 'The Shadow', 'The Shark', 'The Skinny', 'The Smile', 'The Snake', 'The Snitch', 'The Spider', 'The Suit', 'The Terminator', 'The Thin', 'The Tiger', 'The Tough', 'The Trigger', 'The Undertaker', 'The Vet', 'The Viper', 'The Weasel', 'The Whisper', 'The Wig', 'The Wild', 'The Writer', 'Three Fingers', 'Three Toes', 'Tommy Gun', 'Toothless', 'Toughness', 'Triggerfinger', 'Twice Shot', 'Two Fingers', 'Two Toes', 'Two Tricks', 'Two-Knife', 'Venom', 'Watchman', 'Wings', 'Wonderboy'];
var femaleNames = ['Princess', 'Ammo', 'Angel Eyes', 'Angel Wings', 'Angel', 'Baby Face', 'Bandana', 'Beans', 'Big Brains', 'Big Momma', 'Black Eyed', 'Blackjack', 'Blind', 'Blondey', 'Blue Eyes', 'Buddy', 'Bugs', 'Bulletproof', 'Bullettooth', 'Buster', 'Buttercup', 'Buzzy', 'Cheater', 'Coins', 'Coughing', 'Crackers', 'Crazy Eyes', 'Crazy', 'Danger', 'Daydream', 'Deaf', 'Death', 'Diamond', 'Doberman', 'Eagle Eyes', 'Eyepatch', 'Fire', 'Five Fingers', 'Flowers', 'Four Fingers', 'Four Toes', 'Gold Digger', 'Goliath', 'Good Looking', 'Greed', 'Grinning', 'H4X0R', 'Horseface', 'Hot Shot', 'Iceman', 'Iron Girl', 'Iron', 'Knuckles', 'Legs', 'Little Caesar', 'Lucky', 'Machette', 'Machine Gun', 'Mad Bomber', 'Mad Dog', 'Mad Eyed', 'Mad Hatter', 'Mad Girl', 'Meatball', 'Merciless', 'Moneybags', 'Mumbler', 'Muscles', 'Nice Gal', 'Nighthawk', 'Nightmare', 'Nine Lives', 'No Man', 'No Name', 'Numbers', 'The Queen', 'Old Gal', 'One Armed', 'One Eye', 'Peach', 'Peachless', 'Peanuts', 'Pegleg', 'Pink Panther', 'Pitbull', 'Poison', 'Pretty Girl', 'Professional', 'Razor', 'Repo Girl', 'Revolvers', 'Rifleman', 'Roulette', 'Rusty', 'Scarface', 'Scars', 'Shades', 'Shotgun', 'Silence', 'Silver Dollar', 'Sly', 'Smiling', 'Smokes', 'Squint', 'Straight Jacket', 'Sweet Cakes', 'Tall Gal', 'Queen Bee', 'The Siren', 'The Animal', 'The Ant', 'The Banker', 'The Barber', 'The Bat', 'The Bear', 'The Beast', 'The Blast', 'The Boot', 'The Boss', 'The Brain', 'The Brute', 'The Bug', 'The Builder', 'The Bull', 'The Butcher', 'The Bystander', 'The Calm', 'The Cat', 'The Chin', 'The Clown', 'The Cook', 'The Dapper', 'The Dentist', 'The Dove', 'The Duck', 'The Duke', 'The Dwarf', 'The Eagle', 'The Ear', 'The Enforcer', 'The Fang', 'The Fat', 'The Fixer', 'The Fox', 'The Genius', 'Medusa', 'The Ghost', 'The Golfer', 'The Grim Reaper', 'The Grin', 'The Grocer', 'The Hatchet', 'The Hook', 'The Horse', 'The Hulk', 'The Hump', 'The Humpback', 'The Jackal', 'The Jester', 'The Kid', 'The Killer', 'The Lion', 'The Mad', 'The Mammoth', 'The Menace', 'The Midget', 'The Mouse', 'The Night', 'The Nose', 'The Owl', 'The Ox', 'The Panther', 'The Peacemaker', 'The Phantom', 'The Plumber', 'The Poet', 'The Quiet', 'The Rabbit', 'The Rat', 'The Reaper', 'The Witch', 'The Ring', 'The Rock', 'The Saint', 'The Scourge', 'The Serpent', 'The Shadow', 'The Shark', 'The Skinny', 'The Smile', 'The Snake', 'The Snitch', 'The Spider', 'The Suit', 'The Cleaner', 'The Thin', 'The Tiger', 'The Tough', 'The Trigger', 'The Undertaker', 'The Vet', 'The Viper', 'The Weasel', 'The Whisper', 'The Wig', 'The Wild', 'The Writer', 'Three Fingers', 'Three Toes', 'Tommy Gun', 'Toothless', 'Toughness', 'Triggerfinger', 'Twice Shot', 'Two Fingers', 'Two Toes', 'Two Tricks', 'Two-Knife', 'Venom', 'The Banshee', 'Wings', 'Wondergirl'];

/**
 * Get a random nickname.
 *
 * @param {boolean} [male] True for a male, false for a female. A random boolean will be used if undefined.
 * @return {string} Random nick name.
 */
function getRandomNickname(male) {
    // Parse the male parameter
    if(male === undefined)
        male = Math.floor(Math.random() * 2) === 0;

    // Get a random name for the proper gender
    if(male)
        return maleNames[Math.floor(Math.random() * maleNames.length)];
    else
        return femaleNames[Math.floor(Math.random() * femaleNames.length)];
}