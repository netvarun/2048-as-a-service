#!/usr/bin/perl

use strict;
use warnings;
use LWP::Simple;
use JSON::XS;
use Data::Dumper;

my $host = "http://localhost:8080/";

#--Start game
my $gameRef = decode_json(get($host."start"));
my $session_id = $gameRef->{'session_id'};
my $gridRef = $gameRef->{'grid'};
my $score = $gameRef->{'score'};
while(1) {
    print STDERR Dumper($gridRef),"\n";
    print STDERR "Score: $score\n";
    print STDERR "Input:\n";
    my $userInput =  <STDIN>;
    chomp ($userInput);
    print "User typed $userInput\n";
    eval{
    $gameRef = decode_json(get($host."state/$session_id/move/$userInput"));
    }; if($@) { print STDERR "Invalid move...\n"; next; }
    $gridRef = $gameRef->{'grid'};
    $score = $gameRef->{'score'};
}





