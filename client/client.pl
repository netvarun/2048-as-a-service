#!/usr/bin/perl

use strict;
use warnings;
use LWP::Simple;
use JSON::XS;
use Data::Dumper;

my $host = "http://localhost:8080/";

#--Start game
my $gameRef = decode_json(get($host."start/json/thanks"));
my $session_id = $gameRef->{'session_id'};
my $gridRef = $gameRef->{'grid'};
my $score = $gameRef->{'score'};
while(1) {
    prettyPrint( $gridRef );
    print STDERR "Score: $score\n";
    print STDERR "Input:\n";
    my $userInput =  <STDIN>;
    chomp ($userInput);
    print "User typed $userInput\n";
    eval{
    $gameRef = decode_json(get($host."state/$session_id/move/$userInput/json/thanks"));
    }; if($@) { print STDERR "Invalid move...\n"; next; }
    $gridRef = $gameRef->{'grid'};
    $score = $gameRef->{'score'};
}

sub prettyPrint {
    my( $gridRef ) = @_;
    my @gridArr = @{$gridRef};
    for(my $row = 0; $row < scalar @gridArr; $row++) {
        my @colArr = @{$gridArr[$row]};
        foreach(@colArr) {
            print STDERR $_, "    ";
        }
        print STDERR "\n";
    }
}


