var app = angular.module('demoApp',['ngRoute', 'ngAnimate', 'ngSanitize']);
app.filter('filterUnmatched', function() {
	return function(obj) {
		var arr = [];
		angular.forEach(obj, function(item) {
			if (!item || !item.Matched) {
				arr.push(item);
			}
		});
		
		return arr;
	};
});

app.controller('ctrlSummaries', function($scope, SummaryFactory, Utils) {
	window.debugScope = $scope;
	function init() {
		$scope.SortDesc = true;
		$scope.Summaries = {};
		SummaryFactory.getSummaries().success(function(summaries) {			
			$scope.Summaries = summaries;
			populateLookup();
		});
		
		$scope.Books = {};
		SummaryFactory.getBooks().success(function(books) {			
			$scope.Books = books;            			
			populateLookup();
		});
		
		$scope.TestamentNames = SummaryFactory.getTestamentNames();
		
		$scope.Settings = {};
		SummaryFactory.getSettings().success(function(settings) {
			$scope.Settings = settings || {};
		});
	}	
	init();
	
	function initPrompts(){
		// clear out old answers
		$scope.SelectedAnswer = null;
		$scope.SelectedPrompt = null;
		$scope.Prompts = [];
		for (var i = 0; i < $scope.Answers.length; i++) 
		{
			var ans = $scope.Answers[i]; 			
			ans.summary = Utils.Safe(ans.summary).toString();
		}
		
		$scope.Prompts = angular.copy($scope.Answers);
		$scope.Prompts = Utils.Shuffle($scope.Prompts);		
	}
	
	//#region logic
	$scope.LoadAnswers = function() {
		$scope.Answers = getAnswers($scope.SelectedBook, $scope.SelectedTestament, $scope.Settings.NumAnswers);
	    initPrompts();
	};
	
	$scope.SelectAnswer = function(answer) {
		$scope.SelectedAnswer = answer;
		answerCheck();
	};
	$scope.SelectPrompt = function(prompt) {
		// feature - if they click the blank prompt, fill it in with the first unmatched prompt
		if (!prompt) {
			for (var i = 0; i < $scope.Prompts.length; i++) {
				if (!$scope.Prompts[i].Matched) {
					prompt = $scope.Prompts[i]; 
					break;
				}
			}
		}
		$scope.SelectedPrompt = prompt;
		answerCheck();
	};
	$scope.SelectedAnswerChanged = function() {
		answerCheck();
	};
	$scope.RemoveMatch = function() {
		if ($scope.Match) {
			$scope.Match = false;
			$scope.SelectedPrompt.Matched = true;
			$scope.SelectedAnswer.Matched = true;
			$scope.SelectedPrompt = null;
			$scope.SelectedAnswer = null;
		}
	}
	
	$scope.SaveSettings = function(settings) {
		SummaryFactory.saveSettings(settings);
		$scope.ShowSettings = false;
	};
	//#endregion
	
	function answerCheck() {
		if ($scope.SelectedPrompt && $scope.SelectedAnswer) {
			$scope.Match = ($scope.SelectedPrompt.ChapterName === $scope.SelectedAnswer.ChapterName);
		}
	}
		
	function populateLookup() {		
		if ($.isEmptyObject($scope.Books) || $.isEmptyObject($scope.Summaries)) {
			return;
		}
		
		$scope.TestamentsHash = $scope.TestamentsHash || {};
		$scope.Chapters = $scope.Chapters || [];		
		if (!$scope.Chapters.length) {
			var index = 0;
			var testaments = $scope.Summaries.testaments;		
			for (var i = 0; i < testaments.length; i++) {
				var testament = testaments[i];
				testament.DisplayName = $scope.TestamentNames[testament.name];
				$scope.TestamentsHash[testament.name] = { min: index };
				for (var ii = 0; ii < testament.books.length; ii++) {
					var book = testament.books[ii];
					book.DisplayName = $scope.Books[book.name];
					for (var iii = 0; iii < book.chapters.length; iii++) {
						var chapter = book.chapters[iii];
						chapter.Link = testament.name + "/" + book.name + "/" + chapter.name;
						chapter.ChapterName = $scope.Books[book.name] + " " + chapter.name;
						$scope.Chapters.push(chapter);
						index++;
					}
				}
				
				$scope.TestamentsHash[testament.name].max = index - 1;		
			}
		}
	}
			
	/* 
	    get up to x random summaries
	    get up to x random summaries, limited by testament or book
	*/		
	function getAnswers(book, testament, num) {
		num = num || 10;
		var getAll = $scope.Settings.GetAll || false;		
		var selectedTestament, selectedBook;
		if (book && book.chapters) {
			selectedBook = true;
			if (getAll || book.chapters.length < num) {
				getAll = true;
				num = book.chapters.length;
			}
		} else if (testament && testament.books && testament.name) {
			selectedTestament = true;
		}
		
		// for convenience in getting stuff quickly
		populateLookup();
		
		var answerHash = {}; // remember what's already been added
		var answers = [];
		if (selectedBook && getAll) {		
			for (var i = 0; i < num; i++) {
				answers.push(book.chapters[i]);
			}
		} else {
			var min, max;
			if (selectedTestament) {
				var getMinMax = $scope.TestamentsHash[testament.name];
				min = getMinMax.min;
				max = getMinMax.max;
			} else {
				min = 0;
				if (selectedBook) {
					max = book.chapters.length - 1;
				} else {
					max = $scope.Chapters.length - 1;				
				}
			}
			
			var chapterArr = selectedBook ? book.chapters : $scope.Chapters;
			while(answers.length < num){
				var randomnumber = Math.floor(Math.random() * (max - min + 1) + min);
				if (answers.indexOf(chapterArr[randomnumber]) > -1) { continue };
				answers.push(chapterArr[randomnumber]);
			}
		}
		
		return answers;
	}
});

app.factory('SummaryFactory', function($http, $sce) { 
	var factory = {};
	factory.getSummaries = function() {
		return $http.get('/scriptureSummaries.json');
	};
	
	factory.getBooks = function() {
		return $http.get('/scriptureBooks.json');
	};	
	
	factory.getSettings = function() {
		return $http.get('/settings.json');
	};
	
	factory.getTestamentNames = function() {
		return {
		'ot': 'Old Testament', 
        'nt': 'New Testament',
        'bofm': 'Book of Mormon',
        'dc-testament': 'Doctrine and Covenants',
        'pgp': 'Pearl of Great Price'
		};
	};
	
	factory.saveSettings = function(obj) {
		$http.post('/saveSettings', { data: obj });
	};
	
	return factory;
});

app.factory('Utils', function($sce) {
	var utils = {};
	utils.Safe = function(str) {
		return $sce.trustAsHtml(str);
	};
	
	utils.Shuffle = function (a) {
		var j, x, i;
		for (i = a.length; i; i--) {
			j = Math.floor(Math.random() * i);
			x = a[i - 1];
			a[i - 1] = a[j];
			a[j] = x;
		}
		
		return a;
	};	
	
	return utils;
});